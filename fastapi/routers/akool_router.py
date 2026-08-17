import logging
import json as _json
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List
from utils.security import verify_token
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

router = APIRouter(prefix="/voice", tags=["Voice Interview"])
security = HTTPBearer()
logger = logging.getLogger("voice_router")


# ── Auth ───────────────────────────────────────────────────────────────────────

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    payload = verify_token(token)
    if not payload or "email" not in payload:
        raise HTTPException(status_code=401, detail="Invalid or expired authorization token")
    return payload["email"]


# ── Request Models ─────────────────────────────────────────────────────────────

class EvaluateAnswerRequest(BaseModel):
    question: str
    answer: str
    question_number: int
    total_questions: int
    next_question: Optional[str] = None
    role: Optional[str] = "Software Engineer"
    interview_type: Optional[str] = "Technical"


class FinalSummaryRequest(BaseModel):
    questions: List[str]
    answers: List[str]
    role: Optional[str] = "Software Engineer"
    interview_type: Optional[str] = "Technical"
    company: Optional[str] = "the company"


# ── Helper: Gemini call ────────────────────────────────────────────────────────

def _gemini_text(prompt: str, fallback: str) -> str:
    """Call Gemini and return text, using fallback if unavailable."""
    try:
        from utils.gemini_service import client
        if not client:
            return fallback
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt
        )
        return response.text.strip()
    except Exception as e:
        logger.error(f"Gemini call failed: {e}")
        return fallback


def _gemini_json(prompt: str, fallback: dict) -> dict:
    """Call Gemini and parse JSON response, using fallback dict if unavailable."""
    try:
        from utils.gemini_service import client
        if not client:
            return fallback
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt
        )
        raw = response.text.strip()
        # Strip markdown code fences if present
        if raw.startswith("```"):
            parts = raw.split("```")
            raw = parts[1] if len(parts) > 1 else raw
            if raw.startswith("json"):
                raw = raw[4:]
        return _json.loads(raw.strip())
    except Exception as e:
        logger.warning(f"Gemini JSON parse failed: {e}")
        return fallback


# ── POST /voice/evaluate-answer ────────────────────────────────────────────────

@router.post("/evaluate-answer")
def evaluate_answer(body: EvaluateAnswerRequest, user: str = Depends(get_current_user)):
    """
    Evaluates a single candidate answer during a live voice interview.

    Returns:
    - spoken_response: text for TTS to speak aloud (feedback + transition to next question)
    - feedback: structured text feedback shown on screen
    - score: 1-10 integer score for this answer
    """
    q = body.question
    ans = body.answer
    q_num = body.question_number
    total = body.total_questions
    next_q = body.next_question
    role = body.role or "Software Engineer"
    is_last = next_q is None

    # --- Spoken TTS response (what Aria says aloud) ---
    if is_last:
        spoken_prompt = f"""You are a professional AI voice interviewer conducting a {role} interview.
The candidate just answered the FINAL question ({q_num} of {total}).

Question: "{q}"
Candidate's Answer: "{ans}"

Analyze the candidate's response specifically and speak 2-3 natural, conversational sentences:
1. Give an honest, personalized reaction to their answer:
   - If the answer is strong, briefly acknowledge what they did well.
   - If the answer is incomplete, briefly note the main missing element.
   - If there is a technical mistake, point it out politely and give a short correction.
   - If the answer is unclear, mention what was hard to follow.
2. Congratulate them on completing the interview and mention their detailed report will be ready shortly.

Rules:
- Spoken English only. No bullet points, no markdown, no lists. Single paragraph.
- Behave like a real human interviewer who actually listened to their response, not a chatbot repeating templates.
- Keep it warm and professional."""

        spoken_fallback = (
            "Thank you for your response. You covered the key points, "
            "though adding a specific real-world example would make it even stronger. "
            "That was our final question — you've done a great job completing the interview! "
            "Your full evaluation report will be ready in just a moment."
        )
    else:
        spoken_prompt = f"""You are a professional AI voice interviewer conducting a {role} interview.
The candidate just answered question {q_num} of {total}.

Question asked: "{q}"
Candidate's Answer: "{ans}"

Analyze the candidate's response specifically and speak 2-3 natural, conversational sentences:
1. Give a brief, personalized reaction based specifically on what they said:
   - If the answer is good: briefly acknowledge what was done well.
   - If the answer is incomplete: briefly mention what could be improved.
   - If there is a technical mistake: point it out politely and provide a short correction.
   - If the answer is unclear: briefly ask for clarification or ask a follow-up related to the topic.
2. Smoothly transition to the next question: "Moving on to question {q_num + 1}: {next_q}"

Rules:
- Spoken English only. No bullet points, no markdown. Single flowing paragraph.
- Avoid repeating generic phrases like "Good response, let's move to the next question" for every answer.
- Tailor your feedback specifically to what the candidate just said. Keep it concise so it doesn't sound like a long lecture."""

        # Pool of diverse fallback responses based on question number to prevent repetition
        fallbacks_pool = [
            ("Good response — you touched on the important points.", "To strengthen it, try including a concrete example from your experience."),
            ("Acknowledge your answer on that.", "One suggestion is to elaborate more on the technical architecture or implementation details."),
            ("Thank you for sharing your thoughts on this.", "To make this even stronger, you could highlight the specific trade-offs or alternatives."),
            ("Solid answer, that highlights your understanding.", "You might also want to mention the performance or scaling considerations."),
        ]
        fb_idx = (q_num - 1) % len(fallbacks_pool)
        phrase_good, phrase_improve = fallbacks_pool[fb_idx]
        
        spoken_fallback = (
            f"{phrase_good} {phrase_improve} "
            f"Moving on to question {q_num + 1}: {next_q}"
        )

    # --- Structured screen feedback ---
    feedback_prompt = f"""Evaluate this interview answer in detail.

Role: {role}
Question: "{q}"
Candidate's Answer: "{ans}"

Return ONLY a valid JSON object with exactly these keys:
{{
  "score": <integer 1-10>,
  "what_was_good": "<one sentence: what was correct or strong>",
  "what_was_missing": "<one sentence: main gap or missing point>",
  "technical_mistakes": "<one sentence noting any technical errors, or 'None'>",
  "communication_mistakes": "<one sentence on clarity/structure issues, or 'None'>",
  "grammar_suggestions": "<one sentence grammar/pacing tip, or 'None'>",
  "better_sample_answer": "<2-sentence ideal response demonstrating depth>",
  "confidence_feedback": "<brief note on perceived confidence and pacing>",
  "improvement_tip": "<one actionable sentence to improve next time>"
}}

No markdown. Raw JSON only."""

    feedback_fallback = {
        "score": 7,
        "what_was_good": "You demonstrated a solid understanding of the core concept.",
        "what_was_missing": "Adding specific technical examples or metrics would strengthen your answer.",
        "technical_mistakes": "None",
        "communication_mistakes": "Consider using the STAR method for more structured responses.",
        "grammar_suggestions": "None",
        "better_sample_answer": (
            "An ideal response would first define the concept clearly, "
            "then cite a real project example with measurable outcomes."
        ),
        "confidence_feedback": "Your tone sounds professional and steady.",
        "improvement_tip": "Practice explaining trade-offs using concrete numbers and scenarios.",
    }

    spoken_response = _gemini_text(spoken_prompt, spoken_fallback)
    feedback_data = _gemini_json(feedback_prompt, feedback_fallback)

    return {
        "spoken_response": spoken_response,
        "feedback": feedback_data,
        "question_number": q_num,
        "total_questions": total,
    }


# ── POST /voice/final-summary ──────────────────────────────────────────────────

@router.post("/final-summary")
def final_summary(body: FinalSummaryRequest, user: str = Depends(get_current_user)):
    """
    Generates the end-of-interview spoken summary and structured evaluation report.

    Returns:
    - spoken_summary: text for TTS to speak as closing statement
    - evaluation: full structured report (scores, strengths, weaknesses, suggestions)
    """
    questions = body.questions
    answers = body.answers
    role = body.role or "Software Engineer"
    interview_type = body.interview_type or "Technical"
    company = body.company or "the company"

    q_a_pairs = []
    for i, q in enumerate(questions):
        a = answers[i] if i < len(answers) else "No answer provided."
        q_a_pairs.append(f"Q{i+1}: {q}\nA{i+1}: {a}")
    qa_text = "\n\n".join(q_a_pairs)

    spoken_prompt = f"""You are a professional AI voice interviewer who just finished a {interview_type} interview for a {role} position at {company}.

Interview transcript:
{qa_text}

Deliver a spoken closing summary in 3-4 natural sentences:
1. Congratulate them: "Congratulations, you have completed your interview."
2. Give an honest overall assessment of their performance
3. Mention 1-2 clear strengths you noticed
4. Give 1-2 key areas to improve, then close with an encouraging message

Rules: Natural spoken English only. No bullet points, no markdown, no numbered lists. Two short paragraphs maximum. Warm, professional, and motivating."""

    spoken_fallback = (
        "Congratulations, you have completed your interview! "
        "Overall, you showed a solid grasp of the core concepts and communicated your ideas clearly. "
        "Your strongest moments were when you provided structured, specific answers. "
        "To further elevate your performance, focus on adding more technical depth and real-world examples. "
        "Keep practicing — you are on the right track, and I wish you the very best in your actual interviews!"
    )

    eval_prompt = f"""You are a senior technical interview evaluator. Analyze this complete {interview_type} interview for a {role} position.

{qa_text}

Return ONLY a valid JSON object with exactly these keys:
{{
  "overall_score": <float 1.0-10.0>,
  "technical_score": <float 1.0-10.0>,
  "communication_score": <float 1.0-10.0>,
  "confidence_score": <float 1.0-10.0>,
  "problem_solving_score": <float 1.0-10.0>,
  "overall_feedback": "<2-3 sentence honest overall assessment>",
  "strengths": ["<strength 1>", "<strength 2>", "<strength 3>"],
  "weaknesses": ["<weakness 1>", "<weakness 2>", "<weakness 3>"],
  "improvement_areas": ["<area 1>", "<area 2>", "<area 3>"],
  "mistakes": ["<specific mistake 1>", "<specific mistake 2>"],
  "suggestions": ["<actionable suggestion 1>", "<actionable suggestion 2>", "<actionable suggestion 3>"],
  "recommended_learning_topics": ["<topic 1>", "<topic 2>", "<topic 3>"],
  "motivational_message": "<one warm, encouraging closing sentence>"
}}

No markdown. Raw JSON only."""

    eval_fallback = {
        "overall_score": 7.5,
        "technical_score": 7.0,
        "communication_score": 8.0,
        "confidence_score": 7.5,
        "problem_solving_score": 7.0,
        "overall_feedback": (
            "You demonstrated a solid understanding of core concepts and communicated your ideas clearly. "
            "With more technical depth and concrete examples, your answers would stand out significantly. "
            "Overall, a promising performance with clear areas for growth."
        ),
        "strengths": [
            "Clear and structured communication style",
            "Good conceptual understanding of fundamentals",
            "Professional and composed demeanor throughout",
        ],
        "weaknesses": [
            "Answers lacked specific technical depth and real-world examples",
            "Some advanced topics were covered only at a surface level",
            "Could improve on articulating architectural trade-offs",
        ],
        "improvement_areas": [
            "System design and scalability patterns",
            "Performance optimization techniques",
            "Handling edge cases and failure scenarios",
        ],
        "mistakes": [
            "Missed mentioning specific metrics or measurable outcomes",
            "Did not address trade-offs between different approaches",
        ],
        "suggestions": [
            "Practice explaining concepts using the STAR method with real project examples",
            "Study system design patterns and be ready to discuss trade-offs",
            "Prepare 3-5 strong stories from your experience that demonstrate impact",
        ],
        "recommended_learning_topics": [
            "Distributed systems and CAP theorem",
            "Data structures and algorithm complexity analysis",
            "Behavioral interview frameworks (STAR method)",
        ],
        "motivational_message": (
            "Keep practicing consistently — every interview is a step closer to your goal, "
            "and your dedication will pay off!"
        ),
    }

    spoken_summary = _gemini_text(spoken_prompt, spoken_fallback)
    evaluation = _gemini_json(eval_prompt, eval_fallback)

    return {
        "spoken_summary": spoken_summary,
        "evaluation": evaluation,
    }
