"""
Coding Interview Router — Module 12
Provides endpoints for generating coding challenges, running code, and AI-powered code review.
"""

import json
import logging
from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from bson import ObjectId

from database.models import CodingInterviewCreate, CodingInterview, CodeRunRequest, CodeSubmitRequest
from database.schemas import coding_interview_helper, coding_interviews_helper
from database.connection import coding_interviews_collection
from utils.security import verify_token
from utils.code_runner import run_python_code, run_code_against_tests

logger = logging.getLogger("coding_router")

router = APIRouter(prefix="/coding-interviews", tags=["Coding Interviews"])
security = HTTPBearer()


def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    payload = verify_token(token)
    if not payload or "email" not in payload:
        raise HTTPException(status_code=401, detail="Invalid or expired authorization token")
    return payload["email"]


# ── Generate Coding Challenge via Gemini ────────────────────────────────────────

@router.post("")
def create_coding_interview(body: CodingInterviewCreate, user_email: str = Depends(get_current_user)):
    """Generate a new coding challenge using Gemini AI."""
    try:
        challenge = _generate_coding_challenge(body.language, body.difficulty, body.topic)

        doc = CodingInterview(
            user_id=user_email,
            title=challenge.get("title", "Coding Challenge"),
            description=challenge.get("description", "Solve the following problem."),
            language=body.language,
            starter_code=challenge.get("starter_code", ""),
            test_cases=challenge.get("test_cases", []),
            status="pending",
        )

        result = coding_interviews_collection.insert_one(doc.dict())
        saved = coding_interviews_collection.find_one({"_id": result.inserted_id})

        return {
            "message": "Coding challenge created",
            "challenge": coding_interview_helper(saved),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Get all coding interviews for user ──────────────────────────────────────────

@router.get("")
def list_coding_interviews(user_email: str = Depends(get_current_user)):
    data = coding_interviews_collection.find({"user_id": user_email}).sort("created_at", -1)
    return coding_interviews_helper(list(data))


# ── Get single coding interview ────────────────────────────────────────────────

@router.get("/{id}")
def get_coding_interview(id: str, user_email: str = Depends(get_current_user)):
    if not ObjectId.is_valid(id):
        raise HTTPException(status_code=400, detail="Invalid ID format")

    ci = coding_interviews_collection.find_one({"_id": ObjectId(id), "user_id": user_email})
    if not ci:
        raise HTTPException(status_code=404, detail="Coding interview not found")

    return coding_interview_helper(ci)


# ── Run code against test cases ─────────────────────────────────────────────────

@router.post("/{id}/run")
def run_code(id: str, body: CodeRunRequest, user_email: str = Depends(get_current_user)):
    """Run code against all test cases and return execution results."""
    if not ObjectId.is_valid(id):
        raise HTTPException(status_code=400, detail="Invalid ID format")

    ci = coding_interviews_collection.find_one({"_id": ObjectId(id), "user_id": user_email})
    if not ci:
        raise HTTPException(status_code=404, detail="Coding interview not found")

    test_cases = ci.get("test_cases", [])
    results = run_code_against_tests(body.code, test_cases, body.language)

    # Save the user code and execution results
    coding_interviews_collection.update_one(
        {"_id": ObjectId(id)},
        {"$set": {"user_code": body.code, "execution_results": results}},
    )

    passed = sum(1 for r in results if r["passed"])
    total = len(results)

    return {
        "message": f"Passed {passed}/{total} test cases",
        "passed": passed,
        "total": total,
        "results": results,
    }


# ── Submit code for AI evaluation ───────────────────────────────────────────────

@router.post("/{id}/submit")
def submit_code(id: str, body: CodeSubmitRequest, user_email: str = Depends(get_current_user)):
    """Submit code for final AI evaluation with detailed code review."""
    if not ObjectId.is_valid(id):
        raise HTTPException(status_code=400, detail="Invalid ID format")

    ci = coding_interviews_collection.find_one({"_id": ObjectId(id), "user_id": user_email})
    if not ci:
        raise HTTPException(status_code=404, detail="Coding interview not found")

    if ci.get("status") == "completed":
        return {
            "message": "Already submitted",
            "challenge": coding_interview_helper(ci),
        }

    # Run tests first
    test_cases = ci.get("test_cases", [])
    test_results = run_code_against_tests(body.code, test_cases, body.language)
    passed = sum(1 for r in test_results if r["passed"])
    total = len(test_results)

    # Get AI code review from Gemini
    review = _evaluate_code_with_gemini(
        title=ci.get("title", ""),
        description=ci.get("description", ""),
        user_code=body.code,
        language=body.language,
        test_results=test_results,
    )

    score = review.get("score", 0.0)
    feedback = review.get("feedback", "")

    coding_interviews_collection.update_one(
        {"_id": ObjectId(id)},
        {
            "$set": {
                "user_code": body.code,
                "execution_results": test_results,
                "status": "completed",
                "score": score,
                "feedback": feedback,
            }
        },
    )

    # Send notification
    try:
        from routers.notifications_router import create_notification
        create_notification(
            user_id=user_email,
            title="Coding Challenge Evaluated",
            message=f"Your submission for '{ci.get('title', 'Challenge')}' scored {score}/10. {passed}/{total} tests passed.",
            type="success",
            link=f"/interview/coding/{id}",
        )
    except Exception:
        pass

    updated = coding_interviews_collection.find_one({"_id": ObjectId(id)})

    return {
        "message": "Code submitted and evaluated",
        "score": score,
        "feedback": feedback,
        "test_results": test_results,
        "review": review,
        "challenge": coding_interview_helper(updated),
    }


# ── Delete coding interview ────────────────────────────────────────────────────

@router.delete("/{id}")
def delete_coding_interview(id: str, user_email: str = Depends(get_current_user)):
    if not ObjectId.is_valid(id):
        raise HTTPException(status_code=400, detail="Invalid ID format")

    result = coding_interviews_collection.delete_one({"_id": ObjectId(id), "user_id": user_email})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Coding interview not found")

    return {"message": "Coding interview deleted", "id": id}


# ─── Internal Helper Functions ──────────────────────────────────────────────────

def _generate_coding_challenge(language: str, difficulty: str, topic: str) -> dict:
    """Uses Gemini to generate a coding challenge with description, starter code, and test cases."""
    try:
        from utils.gemini_service import client
        if not client:
            raise Exception("Gemini client not available")

        from google.genai import types

        difficulty_map = {
            "Easy": "simple, entry-level challenge suitable for beginners",
            "Medium": "moderate challenge requiring solid algorithmic thinking",
            "Hard": "advanced challenge involving complex algorithms, optimization, or system design",
        }
        diff_desc = difficulty_map.get(difficulty, difficulty_map["Medium"])

        prompt = f"""
        You are an expert coding interview question designer. Generate a single coding challenge.

        Requirements:
        - Language: {language}
        - Difficulty: {difficulty} ({diff_desc})
        - Topic Area: {topic}

        Return a JSON object with:
        {{
          "title": "Short, descriptive title for the challenge",
          "description": "Full problem description in markdown with examples, constraints, and expected behavior",
          "starter_code": "A function signature stub in {language} that the candidate fills in. Include helpful comments.",
          "test_cases": [
            {{"input": "input value as string", "expected": "expected stdout output as string"}},
            {{"input": "another input", "expected": "another expected output"}}
          ]
        }}

        Provide exactly 4 test cases. The code should read from stdin and print to stdout.
        Return only valid JSON. No markdown fences or explanations.
        """

        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
            config=types.GenerateContentConfig(response_mime_type="application/json"),
        )
        return json.loads(response.text.strip())

    except Exception as e:
        logger.warning(f"Gemini coding challenge generation failed, using fallback: {e}")
        return _fallback_challenge(language, difficulty, topic)


def _fallback_challenge(language: str, difficulty: str, topic: str) -> dict:
    """Returns a built-in coding challenge when Gemini is unavailable."""
    challenges = {
        "Easy": {
            "title": "Two Sum",
            "description": "Given a list of integers and a target sum, find two numbers that add up to the target.\n\n**Input:** First line contains the target integer. Second line contains space-separated integers.\n\n**Output:** Print the two numbers separated by a space (smaller first).\n\n**Example:**\n- Input: `9\\n2 7 11 15`\n- Output: `2 7`",
            "starter_code": "# Read input\ntarget = int(input())\nnums = list(map(int, input().split()))\n\n# TODO: Find two numbers that add up to target\n# Print them separated by a space (smaller first)\n",
            "test_cases": [
                {"input": "9\n2 7 11 15", "expected": "2 7"},
                {"input": "6\n3 2 4", "expected": "2 4"},
                {"input": "6\n3 3", "expected": "3 3"},
                {"input": "10\n1 5 5 3", "expected": "5 5"},
            ],
        },
        "Medium": {
            "title": "Longest Substring Without Repeating Characters",
            "description": "Given a string, find the length of the longest substring without repeating characters.\n\n**Input:** A single string.\n\n**Output:** An integer representing the length of the longest substring.\n\n**Example:**\n- Input: `abcabcbb`\n- Output: `3` (the answer is `abc`)",
            "starter_code": "# Read input string\ns = input().strip()\n\n# TODO: Find the length of the longest substring without repeating characters\n# Print the result\n",
            "test_cases": [
                {"input": "abcabcbb", "expected": "3"},
                {"input": "bbbbb", "expected": "1"},
                {"input": "pwwkew", "expected": "3"},
                {"input": "abcdef", "expected": "6"},
            ],
        },
        "Hard": {
            "title": "Merge K Sorted Arrays",
            "description": "Given K sorted arrays, merge them into a single sorted array.\n\n**Input:** First line contains K. Next K lines each contain space-separated sorted integers.\n\n**Output:** A single line with all integers merged and sorted, space-separated.\n\n**Example:**\n- Input: `3\\n1 4 7\\n2 5 8\\n3 6 9`\n- Output: `1 2 3 4 5 6 7 8 9`",
            "starter_code": "import heapq\n\nk = int(input())\narrays = []\nfor _ in range(k):\n    arrays.append(list(map(int, input().split())))\n\n# TODO: Merge all k sorted arrays into one sorted array\n# Print the result as space-separated integers\n",
            "test_cases": [
                {"input": "3\n1 4 7\n2 5 8\n3 6 9", "expected": "1 2 3 4 5 6 7 8 9"},
                {"input": "2\n1 3 5\n2 4 6", "expected": "1 2 3 4 5 6"},
                {"input": "1\n5 10 15", "expected": "5 10 15"},
                {"input": "3\n1\n2\n3", "expected": "1 2 3"},
            ],
        },
    }

    return challenges.get(difficulty, challenges["Medium"])


def _evaluate_code_with_gemini(title: str, description: str, user_code: str, language: str, test_results: list) -> dict:
    """Uses Gemini to perform comprehensive code review and scoring."""
    passed = sum(1 for r in test_results if r["passed"])
    total = len(test_results)

    try:
        from utils.gemini_service import client
        if not client:
            raise Exception("Gemini client not available")

        from google.genai import types

        prompt = f"""
        You are an expert code reviewer evaluating a candidate's coding interview submission.

        Challenge: {title}
        Description: {description}
        Language: {language}

        Candidate's Code:
        ```{language}
        {user_code}
        ```

        Test Results: {passed}/{total} tests passed.
        Detailed Results: {json.dumps(test_results, indent=2)}

        Evaluate the code on a scale of 1.0 to 10.0 considering:
        1. Correctness (test pass rate)
        2. Code quality (readability, naming, structure)
        3. Time complexity
        4. Space complexity
        5. Edge case handling

        Return a JSON object:
        {{
          "score": 7.5,
          "feedback": "Overall assessment of the submission...",
          "time_complexity": "O(n)",
          "space_complexity": "O(1)",
          "code_quality_notes": "Observations about code style...",
          "strengths": ["Strength 1", "Strength 2"],
          "improvements": ["Improvement 1", "Improvement 2"],
          "optimal_approach": "Brief description of the optimal solution approach"
        }}

        Return only valid JSON. No markdown fences.
        """

        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
            config=types.GenerateContentConfig(response_mime_type="application/json"),
        )
        return json.loads(response.text.strip())

    except Exception as e:
        logger.warning(f"Gemini code evaluation failed, using fallback: {e}")

        # Fallback scoring based on test results
        correctness_score = (passed / total * 10) if total > 0 else 0
        score = round(correctness_score * 0.7 + 3.0, 1)  # Base 3 + weighted correctness
        score = min(score, 10.0)

        return {
            "score": score,
            "feedback": f"Passed {passed}/{total} test cases. {'Excellent work!' if passed == total else 'Some test cases failed — review edge cases.'}",
            "time_complexity": "N/A (requires Gemini API)",
            "space_complexity": "N/A (requires Gemini API)",
            "code_quality_notes": "Manual code review not available in fallback mode.",
            "strengths": ["Code compiles and runs without errors."] if passed > 0 else ["Attempted the challenge."],
            "improvements": ["Ensure all test cases pass."] if passed < total else ["Consider optimizing for edge cases."],
            "optimal_approach": "Connect Gemini API for detailed analysis.",
        }
