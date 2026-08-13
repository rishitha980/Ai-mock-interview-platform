from fastapi import APIRouter, HTTPException, Depends, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from database.connection import (
    users_collection,
    interviews_collection,
    results_collection,
    notifications_collection,
    resumes_collection,
    settings_collection
)
from database.schemas import users_helper
from utils.security import verify_token


router = APIRouter(prefix="/admin", tags=["Admin"])
security = HTTPBearer()

def get_current_admin(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """
    Dependency to authenticate and verify that the user has administrative privileges.
    """
    token = credentials.credentials
    payload = verify_token(token)
    if not payload or "email" not in payload:
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired authorization token"
        )
    user_email = payload["email"]
    user = users_collection.find_one({"email": user_email})
    if not user or not user.get("is_admin", False):
        raise HTTPException(
            status_code=403,
            detail="Administrative privileges required"
        )
    return user

@router.get("/stats")
async def get_admin_stats(current_admin: dict = Depends(get_current_admin)):
    """
    Retrieves high-level platform-wide statistics for the admin dashboard.
    """
    total_users = users_collection.count_documents({})
    total_interviews = interviews_collection.count_documents({})
    completed_interviews = interviews_collection.count_documents({"status": "completed"})
    
    completion_rate = 0.0
    if total_interviews > 0:
        completion_rate = round((completed_interviews / total_interviews) * 100, 1)
        
    # Calculate global average score
    completed_list = list(interviews_collection.find({"status": "completed", "score": {"$exists": True}}))
    scores = [i.get("score", 0.0) for i in completed_list if i.get("score") is not None]
    avg_score = round(sum(scores) / len(scores), 1) if scores else 0.0

    return {
        "total_users": total_users,
        "total_interviews": total_interviews,
        "completed_interviews": completed_interviews,
        "completion_rate": completion_rate,
        "average_score": avg_score
    }

@router.get("/users")
async def get_admin_users(current_admin: dict = Depends(get_current_admin)):
    """
    Retrieves all registered users on the platform.
    """
    users = list(users_collection.find())
    return users_helper(users)

@router.put("/users/{email}/toggle-admin")
async def toggle_user_admin(email: str, current_admin: dict = Depends(get_current_admin)):
    """
    Toggles the is_admin administrative status for a user.
    """
    if email == current_admin.get("email"):
        raise HTTPException(
            status_code=400,
            detail="You cannot toggle your own administrative access"
        )
        
    user = users_collection.find_one({"email": email})
    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )
        
    new_status = not user.get("is_admin", False)
    users_collection.update_one({"email": email}, {"$set": {"is_admin": new_status}})
    
    # Create notification for the user
    try:
        from routers.notifications_router import create_notification
        status_text = "granted" if new_status else "revoked"
        create_notification(
            user_id=email,
            title="Account Privileges Updated",
            message=f"Your administrative access has been {status_text}.",
            type="info",
            link="/account"
        )
    except Exception:
        pass
        
    return {
        "message": f"Successfully toggled admin status for {email}",
        "is_admin": new_status
    }

@router.delete("/users/{email}")
async def delete_user(email: str, current_admin: dict = Depends(get_current_admin)):
    """
    Permanently deletes a user and purges all of their interviews, results, resumes, and notifications.
    """
    if email == current_admin.get("email"):
        raise HTTPException(
            status_code=400,
            detail="You cannot delete your own administrative account"
        )
        
    user = users_collection.find_one({"email": email})
    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )
        
    # Delete associated records across all collections
    users_collection.delete_one({"email": email})
    interviews_collection.delete_many({"user_id": email})
    results_collection.delete_many({"user_id": email})
    notifications_collection.delete_many({"user_id": email})
    resumes_collection.delete_many({"user_id": email})
    
    return {
        "message": f"Successfully deleted user {email} and all associated records"
    }

@router.get("/database")
async def get_database_diagnostics(current_admin: dict = Depends(get_current_admin)):
    """
    Retrieves diagnostics and sample documents for the application databases.
    """
    try:
        collections = [
            {"name": "users", "count": users_collection.count_documents({}), "sample": users_collection.find_one() or {}},
            {"name": "interviews", "count": interviews_collection.count_documents({}), "sample": interviews_collection.find_one() or {}},
            {"name": "results", "count": results_collection.count_documents({}), "sample": results_collection.find_one() or {}},
            {"name": "resumes", "count": resumes_collection.count_documents({}), "sample": resumes_collection.find_one() or {}},
            {"name": "notifications", "count": notifications_collection.count_documents({}), "sample": notifications_collection.find_one() or {}},
        ]
        
        # Serialize ObjectIds to strings in sample documents
        for coll in collections:
            sample = coll["sample"]
            if sample and "_id" in sample:
                sample["_id"] = str(sample["_id"])
                
        return {
            "status": "connected",
            "provider": "MongoDB Atlas",
            "collections": collections
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Database diagnostic query failed: {str(e)}"
        )

@router.get("/settings")
async def get_ai_settings(current_admin: dict = Depends(get_current_admin)):
    """
    Retrieves AI model settings configuration.
    """
    settings = settings_collection.find_one({"key": "ai_config"})
    if not settings:
        return {
            "provider": "google-gemini",
            "model": "gemini-1.5-pro",
            "temperature": 0.7,
            "prompt_template": "You are an expert technical interviewer. Ask precise engineering questions based on the candidate's skills and resume. Evaluate their answers with helpful technical critique and clear scoring metrics."
        }
    settings.pop("_id", None)
    return settings

@router.post("/settings")
async def update_ai_settings(request: Request, current_admin: dict = Depends(get_current_admin)):
    """
    Updates AI model settings configuration.
    """
    payload = await request.json()
    settings_collection.update_one(
        {"key": "ai_config"},
        {"$set": {
            "provider": payload.get("provider", "google-gemini"),
            "model": payload.get("model", "gemini-1.5-pro"),
            "temperature": payload.get("temperature", 0.7),
            "prompt_template": payload.get("prompt_template", ""),
            "api_key": payload.get("api_key", "")
        }},
        upsert=True
    )
    return {"message": "Settings updated successfully"}

