"""
resume_router.py — NEW FILE (does not modify any existing file)

Endpoints:
  POST /upload-resume     → accepts PDF/DOCX, stores in 'resumes' collection
  POST /job-description   → accepts JSON body, stores in 'job_descriptions' collection
"""

import base64
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel

from database.connection import resumes_collection, job_descriptions_collection
from utils.security import verify_token

router = APIRouter(tags=["Resume & Job Description"])

security = HTTPBearer()

# ─── Auth dependency (mirrors main.py — no import to avoid circular dep) ───────

def _get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> str:
    token = credentials.credentials
    payload = verify_token(token)
    if not payload or "email" not in payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    return payload["email"]


# ─── Allowed MIME types ────────────────────────────────────────────────────────

ALLOWED_TYPES = {
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/msword",
}

MAX_FILE_BYTES = 5 * 1024 * 1024  # 5 MB


# ─── POST /upload-resume ───────────────────────────────────────────────────────

@router.post("/upload-resume")
async def upload_resume(
    file: UploadFile = File(...),
    user_email: str = Depends(_get_current_user),
):
    """
    Upload a PDF or DOCX resume.
    Replaces the user's previous resume (if any) with the new one.
    Stores file content (base64) + real AI-parsed metadata in the `resumes` collection.
    """
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '{file.content_type}'. Only PDF and DOCX are accepted.",
        )

    raw_bytes = await file.read()

    if len(raw_bytes) > MAX_FILE_BYTES:
        raise HTTPException(status_code=400, detail="File too large. Maximum size is 5 MB.")

    base64_str = base64.b64encode(raw_bytes).decode("utf-8")

    # ── Delete any existing resumes for this user so old data never shows ──
    resumes_collection.delete_many({"user_id": user_email})

    # ── Parse using the real content-based AI analyzer ──────────────────
    from utils.gemini_service import parse_resume_data
    parsed_data = parse_resume_data(base64_str, file.content_type)

    doc = {
        "user_id": user_email,
        "filename": file.filename,
        "content_type": file.content_type,
        "file_data": base64_str,
        "size_bytes": len(raw_bytes),
        "parsed_data": parsed_data,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }

    result = resumes_collection.insert_one(doc)

    return {
        "message": "Resume uploaded successfully",
        "resume_id": str(result.inserted_id),
        "filename": file.filename,
        "parsed_data": parsed_data,
    }


# ─── POST /job-description ─────────────────────────────────────────────────────

class JobDescriptionPayload(BaseModel):
    job_description: str
    interview_id: str | None = None   # optional: link to an existing interview


@router.post("/job-description")
async def save_job_description(
    payload: JobDescriptionPayload,
    user_email: str = Depends(_get_current_user),
):
    """
    Save a job description text to the `job_descriptions` collection.
    Optionally linked to an interview_id.
    """
    if not payload.job_description.strip():
        raise HTTPException(status_code=400, detail="Job description cannot be empty.")

    doc = {
        "user_id": user_email,
        "job_description": payload.job_description.strip(),
        "interview_id": payload.interview_id,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }

    result = job_descriptions_collection.insert_one(doc)

    return {
        "message": "Job description saved successfully",
        "jd_id": str(result.inserted_id),
    }


# ─── GET /resumes ──────────────────────────────────────────────────────────────

@router.get("/resumes")
def list_resumes(user_email: str = Depends(_get_current_user)):
    """
    List all uploaded resumes of the logged-in user.
    """
    res = resumes_collection.find({"user_id": user_email}).sort("created_at", -1)
    return [{
        "id": str(r["_id"]),
        "filename": r["filename"],
        "content_type": r["content_type"],
        "size_bytes": r["size_bytes"],
        "created_at": r["created_at"],
        "parsed_data": r.get("parsed_data", {})
    } for r in res]


# ─── GET /resumes/{id}/parsed ──────────────────────────────────────────────────

@router.get("/resumes/{id}/parsed")
def get_parsed_resume(id: str, user_email: str = Depends(_get_current_user)):
    """
    Fetch parsed resume skills and profile metadata.
    """
    from bson import ObjectId
    if not ObjectId.is_valid(id):
        raise HTTPException(status_code=400, detail="Invalid ID format")
    resume = resumes_collection.find_one({"_id": ObjectId(id), "user_id": user_email})
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")
    return resume.get("parsed_data", {})


# ─── POST /matching/score ──────────────────────────────────────────────────────

class MatchPayload(BaseModel):
    resume_id: str
    job_description: str


@router.post("/matching/score")
def match_resume_score(payload: MatchPayload, user_email: str = Depends(_get_current_user)):
    """
    Performs JD-Resume ATS matching comparison.
    """
    from bson import ObjectId
    if not ObjectId.is_valid(payload.resume_id):
        raise HTTPException(status_code=400, detail="Invalid Resume ID format")
    resume = resumes_collection.find_one({"_id": ObjectId(payload.resume_id), "user_id": user_email})
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")
        
    parsed_info = resume.get("parsed_data", {})
    if not parsed_info:
        raise HTTPException(status_code=400, detail="Resume has no parsed data")
        
    from utils.gemini_service import match_resume_to_jd
    match_result = match_resume_to_jd(parsed_info, payload.job_description)
    return match_result


# ─── GET /resumes/{id}/download ────────────────────────────────────────────────
@router.get("/resumes/{id}/download")
def download_resume(id: str, user_email: str = Depends(_get_current_user)):
    """
    Download/retrieve the binary file content of the uploaded resume.
    """
    from bson import ObjectId
    import base64
    from fastapi.responses import Response

    if not ObjectId.is_valid(id):
        raise HTTPException(status_code=400, detail="Invalid ID format")
    resume = resumes_collection.find_one({"_id": ObjectId(id), "user_id": user_email})
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")

    file_bytes = base64.b64decode(resume["file_data"])
    filename = resume.get("filename", "resume.pdf")
    content_type = resume.get("content_type", "application/pdf")

    return Response(
        content=file_bytes,
        media_type=content_type,
        headers={"Content-Disposition": f"attachment; filename=\"{filename}\""}
    )


# ─── DELETE /resumes/{id} ──────────────────────────────────────────────────────
@router.delete("/resumes/{id}")
def delete_resume(id: str, user_email: str = Depends(_get_current_user)):
    """
    Delete a resume from the database.
    """
    from bson import ObjectId
    if not ObjectId.is_valid(id):
        raise HTTPException(status_code=400, detail="Invalid ID format")
    result = resumes_collection.delete_one({"_id": ObjectId(id), "user_id": user_email})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Resume not found")
    return {"message": "Resume deleted successfully", "id": id}

