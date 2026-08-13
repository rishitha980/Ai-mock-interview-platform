from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from bson import ObjectId
from typing import List
from datetime import datetime

from database.models import Interview, InterviewCreate, AnswerSubmission
from database.schemas import interview_helper, interviews_helper
from database.connection import interviews_collection, results_collection
from utils.security import verify_token
from auth.auth import router as auth_router
from utils.gemini_service import generate_questions, evaluate_answers

app = FastAPI(title="AI Mock Interview API")

# Configure CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

security = HTTPBearer()

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """
    FastAPI security dependency to authenticate JWT tokens and return the user's email.
    Provides native Swagger UI authorization support.
    """
    token = credentials.credentials
    payload = verify_token(token)
    if not payload or "email" not in payload:
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired authorization token"
        )
    return payload["email"]

router = APIRouter()

# Root Route (public)
@router.get("/")
async def root():
    return {"message": "Welcome to AI Mock Interview API"}

# Create Interview (Generates questions via Gemini)
@router.post("/interviews")
async def create_interview(interview_in: InterviewCreate, user_email: str = Depends(get_current_user)):
    # Validate required fields before hitting Gemini
    if not interview_in.role.strip():
        raise HTTPException(
            status_code=422,
            detail="Job role is required to generate interview questions."
        )
    if not interview_in.job_description.strip():
        raise HTTPException(
            status_code=422,
            detail="A job description is required. Interview questions cannot be generated without it."
        )
    if not interview_in.tech_stack or len(interview_in.tech_stack) == 0:
        raise HTTPException(
            status_code=422,
            detail="At least one technology must be specified in the tech stack."
        )

    # Validate duration and question count constraints
    if interview_in.num_questions is not None and interview_in.num_questions > 10:
        raise HTTPException(
            status_code=422,
            detail="Number of questions cannot exceed 10."
        )

    if interview_in.duration_minutes is not None:
        if interview_in.duration_minutes < 10 or interview_in.duration_minutes > 20:
            raise HTTPException(
                status_code=422,
                detail="Interview duration must be between 10 and 20 minutes."
            )

    # Compute scheduled timestamp if provided
    scheduled_ts = 0
    if interview_in.scheduled_date and interview_in.scheduled_time:
        try:
            dt_str = f"{interview_in.scheduled_date} {interview_in.scheduled_time}"
            dt_obj = datetime.strptime(dt_str, "%Y-%m-%d %H:%M")
            scheduled_ts = int(dt_obj.timestamp())
        except Exception:
            try:
                dt_str = f"{interview_in.scheduled_date} {interview_in.scheduled_time}"
                dt_obj = datetime.fromisoformat(dt_str)
                scheduled_ts = int(dt_obj.timestamp())
            except Exception:
                scheduled_ts = int(datetime.now().timestamp())
    elif interview_in.scheduled_timestamp:
        scheduled_ts = interview_in.scheduled_timestamp

    status_val = "scheduled" if scheduled_ts > int(datetime.now().timestamp()) + 30 else "ready"

    try:
        # Call Gemini to generate questions
        questions = generate_questions(
            role=interview_in.role,
            experience=interview_in.experience,
            tech_stack=interview_in.tech_stack,
            job_description=interview_in.job_description,
            difficulty_level=interview_in.difficulty_level,
            num_questions=interview_in.num_questions or 10,
            preferred_language=interview_in.preferred_language or "English"
        )
        
        interview_data = Interview(
            user_id=user_email,
            role=interview_in.role,
            experience=interview_in.experience,
            tech_stack=interview_in.tech_stack,
            job_description=interview_in.job_description,
            difficulty_level=interview_in.difficulty_level,
            company_name=interview_in.company_name,
            interview_type=interview_in.interview_type or "Technical",
            num_questions=interview_in.num_questions or len(questions) or 10,
            preferred_language=interview_in.preferred_language or "English",
            scheduled_date=interview_in.scheduled_date,
            scheduled_time=interview_in.scheduled_time,
            scheduled_timestamp=scheduled_ts,
            duration_minutes=interview_in.duration_minutes or 20,
            questions=questions,
            status=status_val,
            resume_id=interview_in.resume_id
        )
        
        result = interviews_collection.insert_one(interview_data.dict())
        interview_id = str(result.inserted_id)
        
        from routers.notifications_router import create_notification
        try:
            create_notification(
                user_id=user_email,
                title="Practice Room Initialized",
                message=f"Your mock interview for {interview_in.role} has been set up at {interview_in.difficulty_level} difficulty.",
                type="info",
                link=f"/interview/{interview_id}"
            )
        except Exception:
            pass
            
        return {
            "message": "Interview created successfully",
            "id": interview_id,
            "questions": questions
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )

# Get all interviews for current user
@router.get("/interviews")
async def get_interviews(user_email: str = Depends(get_current_user)):
    data = interviews_collection.find({"user_id": user_email})
    return interviews_helper(list(data))

# Get a specific interview
@router.get("/interviews/{id}")
async def get_interview(id: str, user_email: str = Depends(get_current_user)):
    if not ObjectId.is_valid(id):
        raise HTTPException(status_code=400, detail="Invalid Interview ID format")
        
    interview = interviews_collection.find_one({"_id": ObjectId(id), "user_id": user_email})
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")
        
    return interview_helper(interview)

# Submit answers and evaluate using Gemini
@router.post("/interviews/{id}/submit")
async def submit_answers(id: str, submission: AnswerSubmission, user_email: str = Depends(get_current_user)):
    if not ObjectId.is_valid(id):
        raise HTTPException(status_code=400, detail="Invalid Interview ID format")
        
    interview = interviews_collection.find_one({"_id": ObjectId(id), "user_id": user_email})
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")
        
    if interview.get("status") == "completed":
        # If already completed, check if results exist
        existing_res = results_collection.find_one({"interview_id": id})
        if existing_res:
            existing_res["_id"] = str(existing_res["_id"])
            return {
                "message": "Interview was already submitted",
                "result": existing_res
            }
            
    # Extract questions and user answers
    questions = interview.get("questions", [])
    answers = [ans.answer for ans in submission.answers]
    
    # Call Gemini to evaluate answers
    evaluation = evaluate_answers(questions, answers)
    
    # Structure results document
    result_doc = {
        "interview_id": id,
        "user_id": user_email,
        "answers": [ans.dict() for ans in submission.answers],
        "evaluations": evaluation.get("evaluations", []),
        "overall_score": evaluation.get("overall_score", 0.0),
        "technical_score": evaluation.get("technical_score", 0.0),
        "communication_score": evaluation.get("communication_score", 0.0),
        "overall_feedback": evaluation.get("overall_feedback", ""),
        "strengths": evaluation.get("strengths", []),
        "weaknesses": evaluation.get("weaknesses", []),
        "created_at": int(datetime.now().timestamp())
    }
    
    # Store results in MongoDB
    res = results_collection.insert_one(result_doc)
    result_doc["_id"] = str(res.inserted_id)
    
    # Update Interview Status, score and feedback
    interviews_collection.update_one(
        {"_id": ObjectId(id)},
        {
            "$set": {
                "status": "completed",
                "score": evaluation.get("overall_score", 0.0),
                "feedback": evaluation.get("overall_feedback", "")
            }
        }
    )
    
    from routers.notifications_router import create_notification
    try:
        create_notification(
            user_id=user_email,
            title="Evaluation Report Compiled",
            message=f"Your practice session for {interview.get('role')} is graded. Final Score: {evaluation.get('overall_score', 0.0)}/10.",
            type="success",
            link=f"/interview/{id}/result"
        )
    except Exception:
        pass

    # Send Rich Email Report
    try:
        from utils.email_service import send_interview_report_email
        send_interview_report_email(
            to_email=user_email,
            role=interview.get("role", "Software Engineer"),
            difficulty=interview.get("difficulty_level", "Medium"),
            overall_score=evaluation.get("overall_score", 0.0),
            tech_score=evaluation.get("technical_score", evaluation.get("overall_score", 0.0)),
            comm_score=evaluation.get("communication_score", evaluation.get("overall_score", 0.0)),
            feedback=evaluation.get("overall_feedback", ""),
            strengths=evaluation.get("strengths", []),
            weaknesses=evaluation.get("weaknesses", []),
            interview_id=id
        )
    except Exception as e:
        print(f"[EMAIL EXCEPTION] Failed to send report email: {e}")
    
    return {
        "message": "Answers submitted and evaluated successfully",
        "result": result_doc
    }

# Get Interview Results for a specific interview
@router.get("/interviews/{id}/result")
async def get_interview_result(id: str, user_email: str = Depends(get_current_user)):
    if not ObjectId.is_valid(id):
        raise HTTPException(status_code=400, detail="Invalid Interview ID format")
        
    result_doc = results_collection.find_one({"interview_id": id, "user_id": user_email})
    if not result_doc:
        raise HTTPException(status_code=404, detail="Interview results not found")
        
    result_doc["_id"] = str(result_doc["_id"])
    return result_doc

# Delete Interview
@router.delete("/interviews/{id}")
async def delete_interview(id: str, user_email: str = Depends(get_current_user)):
    if not ObjectId.is_valid(id):
        raise HTTPException(status_code=400, detail="Invalid ID format")
        
    result = interviews_collection.delete_one({"_id": ObjectId(id), "user_id": user_email})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Interview not found")
        
    # Also delete associated results if any
    results_collection.delete_one({"interview_id": id})
    
    return {
        "message": "Deleted successfully",
        "id": id
    }

# Get Dashboard Stats
@router.get("/dashboard/stats")
async def get_dashboard_stats(user_email: str = Depends(get_current_user)):
    import time
    import datetime
    
    interviews = list(interviews_collection.find({"user_id": user_email}))
    
    # Total completed interviews
    completed_interviews = sum(1 for i in interviews if i.get("status") == "completed")
    
    # Average score of completed interviews
    scores = [i.get("score", 0.0) for i in interviews if i.get("status") == "completed" and i.get("score") is not None]
    avg_score = round(sum(scores) / len(scores), 1) if scores else 0.0
    avg_score = round(avg_score, 1)
    
    # Upcoming interviews scheduled for a future date and time
    now_ts = int(time.time())
    upcoming_interviews = sum(
        1 for i in interviews 
        if i.get("status") not in ["completed", "cancelled"] 
        and (i.get("scheduled_timestamp") or 0) > now_ts
    )
    
    # Calculate streak (consecutive days of completed interviews)
    completed_dates = sorted(
        list(set(
            datetime.datetime.fromtimestamp(i.get("created_at") or i.get("updated_at") or time.time()).date()
            for i in interviews if i.get("status") == "completed"
        )),
        reverse=True
    )
    
    streak = 0
    if completed_dates:
        today = datetime.date.today()
        # If the most recent completion is today or yesterday, start the streak count
        if completed_dates[0] == today or completed_dates[0] == today - datetime.timedelta(days=1):
            streak = 1
            for idx in range(len(completed_dates) - 1):
                if completed_dates[idx] - completed_dates[idx+1] == datetime.timedelta(days=1):
                    streak += 1
                else:
                    break

    # Average sub-scores from evaluation results
    results = list(results_collection.find({"user_id": user_email}))
    avg_technical = sum(r.get("technical_score", 0.0) for r in results) / len(results) if results else 0.0
    avg_communication = sum(r.get("communication_score", 0.0) for r in results) / len(results) if results else 0.0
    
    # Fallback to overall avg_score if no results found but completed_interviews exists
    if avg_technical == 0.0 and completed_interviews > 0:
        avg_technical = avg_score
    if avg_communication == 0.0 and completed_interviews > 0:
        avg_communication = avg_score

    return {
        "total_interviews": completed_interviews,
        "completed_interviews": completed_interviews,
        "upcoming_interviews": upcoming_interviews,
        "average_score": avg_score,
        "current_streak": streak,
        "avg_technical": round(avg_technical, 2),
        "avg_communication": round(avg_communication, 2)
    }

app.include_router(router)
app.include_router(auth_router)
# ── NEW: resume upload & job description endpoints ────────────────────────────
from routers.resume_router import router as resume_router
app.include_router(resume_router)
from routers.profile_router import router as profile_router
from routers.notifications_router import router as notifications_router
from routers.admin_router import router as admin_router
app.include_router(profile_router)
app.include_router(notifications_router)
app.include_router(admin_router)

# ── Module 11: Google OAuth SSO ─────────────────────────────────────────────────
from routers.oauth_router import router as oauth_router
app.include_router(oauth_router)

# ── Module 12: Coding Interview & Sandbox ───────────────────────────────────────
from routers.coding_router import router as coding_router
app.include_router(coding_router)

# ── Module 13: File Storage ─────────────────────────────────────────────────────
from routers.storage_router import router as storage_router
app.include_router(storage_router)

# ── Voice Interview AI (Gemini evaluate-answer & final-summary) ────────────────
from routers.akool_router import router as voice_router
app.include_router(voice_router)

# ── Module: Interview History ────────────────────────────────────────────────
from routers.history_router import router as history_router
app.include_router(history_router)

# Mount local uploads directory for development fallback
import os
from fastapi.staticfiles import StaticFiles
uploads_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "uploads")
os.makedirs(uploads_dir, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=uploads_dir), name="uploads")
