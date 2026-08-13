from fastapi import APIRouter, Depends, HTTPException
from database.connection import users_collection
from database.models import UserProfileUpdate
from database.schemas import user_helper
from utils.security import hash_password
from routers.resume_router import _get_current_user

router = APIRouter(tags=["User Profile"])

@router.get("/profile")
def get_profile(user_email: str = Depends(_get_current_user)):
    db_user = users_collection.find_one({"email": user_email})
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    return user_helper(db_user)

@router.put("/profile")
def update_profile(payload: UserProfileUpdate, user_email: str = Depends(_get_current_user)):
    db_user = users_collection.find_one({"email": user_email})
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    update_data = {}
    if payload.name is not None and payload.name.strip():
        update_data["name"] = payload.name.strip()
    
    if payload.password is not None and payload.password.strip():
        # Minimum password length validation
        if len(payload.password) < 6:
            raise HTTPException(status_code=400, detail="Password must be at least 6 characters long")
        update_data["password"] = hash_password(payload.password)

    if payload.college is not None:
        update_data["college"] = payload.college.strip()

    if payload.experience is not None:
        update_data["experience"] = payload.experience.strip()

    if payload.target_role is not None:
        update_data["target_role"] = payload.target_role.strip()

    if payload.skills is not None:
        update_data["skills"] = payload.skills

    if payload.resume is not None:
        update_data["resume"] = payload.resume.strip()
        
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")
        
    users_collection.update_one({"email": user_email}, {"$set": update_data})
    
    updated_user = users_collection.find_one({"email": user_email})
    return {
        "message": "Profile updated successfully",
        "user": user_helper(updated_user)
    }
