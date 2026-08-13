from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional
import math
import re
import datetime

from database.connection import interviews_collection, results_collection
from utils.security import verify_token

router = APIRouter(prefix="/history", tags=["Interview History"])
security = HTTPBearer()


def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    payload = verify_token(token)
    if not payload or "email" not in payload:
        raise HTTPException(status_code=401, detail="Invalid or expired authorization token")
    return payload["email"]


@router.get("/stats")
async def get_history_stats(user_email: str = Depends(get_current_user)):
    """Return aggregate statistics for the current user's interview history."""
    interviews = list(interviews_collection.find({"user_id": user_email}))
    completed = [i for i in interviews if i.get("status") == "completed"]
    total = len(completed)

    if total == 0:
        return {"total_interviews": 0, "average_score": 0, "best_score": 0, "total_minutes": 0}

    scores = [
        round((i.get("score", 0.0) / 10) * 100, 1)
        for i in completed
        if i.get("score") is not None
    ]
    avg_score = round(sum(scores) / len(scores), 1) if scores else 0
    best_score = max(scores) if scores else 0
    total_minutes = sum(i.get("duration_minutes", 0) or 0 for i in completed)

    return {
        "total_interviews": total,
        "average_score": avg_score,
        "best_score": best_score,
        "total_minutes": total_minutes,
    }


@router.get("/filter-options")
async def get_filter_options(user_email: str = Depends(get_current_user)):
    """Return distinct roles and statuses for filter dropdowns."""
    pipeline_roles = [
        {"$match": {"user_id": user_email}},
        {"$group": {"_id": "$role"}},
        {"$sort": {"_id": 1}},
    ]
    roles = [doc["_id"] for doc in interviews_collection.aggregate(pipeline_roles) if doc["_id"]]

    pipeline_statuses = [
        {"$match": {"user_id": user_email}},
        {"$group": {"_id": "$status"}},
        {"$sort": {"_id": 1}},
    ]
    statuses = [doc["_id"] for doc in interviews_collection.aggregate(pipeline_statuses) if doc["_id"]]

    return {
        "roles": roles,
        "difficulties": ["Easy", "Medium", "Hard"],
        "statuses": statuses,
    }


@router.get("/")
async def get_interview_history(
    user_email: str = Depends(get_current_user),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=50),
    search: Optional[str] = Query(None),
    role: Optional[str] = Query(None),
    difficulty: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
):
    """Paginated interview history for the current user with search and filters."""
    query: dict = {"user_id": user_email}

    if search and search.strip():
        pattern = re.compile(re.escape(search.strip()), re.IGNORECASE)
        query["$or"] = [
            {"role": {"$regex": pattern}},
            {"company_name": {"$regex": pattern}},
            {"interview_type": {"$regex": pattern}},
        ]

    if role and role not in ("all", "All Roles", ""):
        query["role"] = {"$regex": re.compile(re.escape(role), re.IGNORECASE)}

    if difficulty and difficulty not in ("all", "All Difficulty", ""):
        query["difficulty_level"] = {"$regex": re.compile(re.escape(difficulty), re.IGNORECASE)}

    if status and status not in ("all", "All Status", ""):
        query["status"] = {"$regex": re.compile(re.escape(status), re.IGNORECASE)}

    if date_from or date_to:
        ts_filter: dict = {}
        if date_from:
            try:
                dt = datetime.datetime.strptime(date_from, "%Y-%m-%d")
                ts_filter["$gte"] = int(dt.timestamp())
            except ValueError:
                pass
        if date_to:
            try:
                dt = datetime.datetime.strptime(date_to, "%Y-%m-%d")
                dt = dt.replace(hour=23, minute=59, second=59)
                ts_filter["$lte"] = int(dt.timestamp())
            except ValueError:
                pass
        if ts_filter:
            query["created_at"] = ts_filter

    total_count = interviews_collection.count_documents(query)
    total_pages = max(1, math.ceil(total_count / page_size))
    skip = (page - 1) * page_size

    cursor = (
        interviews_collection.find(query)
        .sort("created_at", -1)
        .skip(skip)
        .limit(page_size)
    )

    items = []
    for doc in cursor:
        score_raw = doc.get("score", 0.0) or 0.0
        score_pct = round((score_raw / 10) * 100, 1) if score_raw else 0

        created_ts = doc.get("created_at", 0)
        try:
            date_str = datetime.datetime.fromtimestamp(created_ts).strftime("%d %b, %Y") if created_ts else ""
        except Exception:
            date_str = ""

        items.append({
            "id": str(doc["_id"]),
            "role": doc.get("role", ""),
            "company_name": doc.get("company_name", ""),
            "interview_type": doc.get("interview_type", "Technical"),
            "difficulty": doc.get("difficulty_level", "Medium"),
            "score": score_pct,
            "duration_minutes": doc.get("duration_minutes", 0),
            "status": doc.get("status", "scheduled"),
            "date": date_str,
            "created_at": created_ts,
        })

    return {
        "items": items,
        "total": total_count,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages,
    }
