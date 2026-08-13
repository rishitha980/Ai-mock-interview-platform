from fastapi import APIRouter, HTTPException
from database.connection import users_collection
from database.models import User, UserLogin
from utils.security import hash_password, verify_password, create_token

router = APIRouter()


# SIGNUP
@router.post("/signup")
def signup(user: User):
    existing = users_collection.find_one({"email": user.email})
    if existing:
        raise HTTPException(status_code=400, detail="User already exists")

    user.password = hash_password(user.password)

    users_collection.insert_one(user.dict())

    from routers.notifications_router import create_notification
    try:
        create_notification(
            user_id=user.email,
            title="Welcome to AI Mock Interview!",
            message=f"Hi {user.name}, start practicing today by setting up your first mock interview session.",
            type="welcome",
            link="/interview/new"
        )
    except Exception:
        pass

    return {"message": "User created successfully"}


# LOGIN
@router.post("/login")
def login(user: UserLogin):
    db_user = users_collection.find_one({"email": user.email})

    if not db_user:
        raise HTTPException(status_code=400, detail="User not found")

    if not verify_password(user.password, db_user["password"]):
        raise HTTPException(status_code=400, detail="Incorrect password")

    token = create_token({"email": user.email})

    return {"access_token": token}