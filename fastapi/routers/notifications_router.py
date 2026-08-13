from fastapi import APIRouter, Depends, HTTPException
from bson import ObjectId
from datetime import datetime, timezone
from database.connection import notifications_collection
from routers.resume_router import _get_current_user

router = APIRouter(tags=["Notifications"])

def create_notification(user_id: str, title: str, message: str, type: str = "info", link: str = None):
    """
    Helper function to insert a notification into MongoDB.
    """
    notification = {
        "user_id": user_id,
        "title": title,
        "message": message,
        "type": type,
        "is_read": False,
        "link": link,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    notifications_collection.insert_one(notification)

def notification_helper(notif):
    return {
        "id": str(notif["_id"]),
        "user_id": notif["user_id"],
        "title": notif["title"],
        "message": notif["message"],
        "type": notif.get("type", "info"),
        "is_read": notif.get("is_read", False),
        "link": notif.get("link"),
        "created_at": notif.get("created_at")
    }

@router.get("/notifications")
def get_notifications(user_email: str = Depends(_get_current_user)):
    data = notifications_collection.find({"user_id": user_email}).sort("created_at", -1)
    return [notification_helper(n) for n in data]

@router.put("/notifications/{id}/read")
def mark_as_read(id: str, user_email: str = Depends(_get_current_user)):
    if not ObjectId.is_valid(id):
        raise HTTPException(status_code=400, detail="Invalid notification ID format")
        
    result = notifications_collection.update_one(
        {"_id": ObjectId(id), "user_id": user_email},
        {"$set": {"is_read": True}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Notification not found")
        
    return {"message": "Notification marked as read"}

@router.post("/notifications/remind")
def send_interview_reminders(user_email: str = Depends(_get_current_user)):
    from database.connection import interviews_collection
    from utils.email_service import send_email_report
    
    # Find pending interviews for this user
    pending_interviews = list(interviews_collection.find({"user_id": user_email, "status": "pending"}))
    if not pending_interviews:
        return {"message": "No pending interviews to remind."}
        
    sent_count = 0
    for interview in pending_interviews:
        interview_id_str = str(interview["_id"])
        
        # Create user notification in DB
        notif_msg = f"Reminder: Your mock interview for {interview['role']} is pending. Please complete it when ready."
        create_notification(
            user_id=user_email,
            title="Interview Room Pending",
            message=notif_msg,
            type="info",
            link=f"/interview/{interview_id_str}"
        )
        
        # Send email reminder
        email_body = f"""
        <h2>Mock Interview Reminder</h2>
        <p>Hi there,</p>
        <p>This is a quick reminder that your mock interview session for the role of <strong>{interview['role']}</strong> ({interview.get('difficulty_level', 'Medium')} difficulty) is still pending.</p>
        <p>Practicing regularly is the best way to prepare for real-world interviews!</p>
        <p><a href="http://localhost:3000/interview/{interview_id_str}" style="background-color: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">Resume Session</a></p>
        <br>
        <p>Good luck,</p>
        <p>AI Mock Interview Team</p>
        """
        send_email_report(
            to_email=user_email,
            subject=f"Reminder: Complete your {interview['role']} Mock Interview",
            html_body=email_body
        )
        sent_count += 1
        
    return {"message": f"Sent {sent_count} reminder notification(s) & email(s)"}
