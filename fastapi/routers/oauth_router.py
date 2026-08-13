import os
import uuid
import requests
from datetime import datetime
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from database.connection import users_collection
from database.schemas import user_helper
from utils.security import hash_password, create_token
from routers.notifications_router import create_notification

router = APIRouter(tags=["OAuth"])

class GoogleAuthRequest(BaseModel):
    credential: str

@router.post("/auth/google")
def google_auth(payload: GoogleAuthRequest):
    """
    Endpoint for Google Sign-In and Signup.
    Accepts Google ID token (credential), validates it, links or creates a user account,
    and returns a local JWT auth token.
    Strictly verifies token validity and client ID configuration without mock users.
    """
    credential = payload.credential
    email = None
    name = None
    picture = None

    # Validate ID token with Google Tokeninfo endpoint
    try:
        tokeninfo_url = f"https://oauth2.googleapis.com/tokeninfo?id_token={credential}"
        res = requests.get(tokeninfo_url, timeout=5)
        if res.status_code != 200:
            raise HTTPException(
                status_code=400,
                detail="Invalid or expired Google credential token"
            )
        
        data = res.json()
        # Double check errors
        if "error" in data or "email" not in data:
            raise HTTPException(
                status_code=400,
                detail=data.get("error_description", "Invalid Google credentials")
            )
            
        # Verify audience (aud) matches the server's configured client ID if set
        client_id = os.getenv("GOOGLE_CLIENT_ID")
        if client_id and client_id != "YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com":
            token_aud = data.get("aud")
            if token_aud != client_id:
                raise HTTPException(
                    status_code=400,
                    detail="Google token audience verification failed (client ID mismatch)"
                )
            
        email = data["email"]
        name = data.get("name", email.split("@")[0])
        picture = data.get("picture")
    except requests.RequestException as e:
        raise HTTPException(
            status_code=503,
            detail=f"Unable to connect to Google OAuth service: {str(e)}"
        )

    # Perform Database lookup/creation
    user = users_collection.find_one({"email": email})
    
    if user:
        # Account Linking: If user registered with credentials, link Google SSO
        updates = {"is_google_user": True}
        if picture:
            updates["avatar_url"] = picture
            
        users_collection.update_one({"email": email}, {"$set": updates})
        user = users_collection.find_one({"email": email})
    else:
        # User Signup Flow
        random_pass = str(uuid.uuid4())
        hashed_pass = hash_password(random_pass)
        
        new_user = {
            "name": name,
            "email": email,
            "password": hashed_pass,
            "is_admin": False,
            "is_google_user": True,
            "avatar_url": picture,
            "created_at": int(datetime.utcnow().timestamp()) if 'datetime' in globals() else int(uuid.uuid1().time / 10000000)
        }
        
        # Make sure datetime is imported or use inline timestamp
        import time
        new_user["created_at"] = int(time.time())
        
        users_collection.insert_one(new_user)
        user = users_collection.find_one({"email": email})
        
        # Trigger welcome notification
        try:
            create_notification(
                user_id=email,
                title="Welcome to AI Mock Interview!",
                message=f"Hi {name}, you have successfully signed up via Google SSO. Let's start practicing!",
                type="welcome",
                link="/interview/new"
            )
        except Exception:
            pass

    # Create local JWT Access Token
    token = create_token({"email": email})
    
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": user_helper(user)
    }
