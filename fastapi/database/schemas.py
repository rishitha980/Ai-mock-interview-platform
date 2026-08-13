def interview_helper(interview):
    return {
        "id": str(interview["_id"]),
        "role": interview["role"],
        "experience": interview["experience"],
        "tech_stack": interview["tech_stack"],
        "job_description": interview.get("job_description", ""),
        "questions": interview.get("questions", []),
        "score": interview.get("score", 0),
        "feedback": interview.get("feedback", ""),
        "status": interview.get("status", "scheduled"),
        "difficulty_level": interview.get("difficulty_level", "Medium"),
        "company_name": interview.get("company_name"),
        "interview_type": interview.get("interview_type", "Technical"),
        "num_questions": interview.get("num_questions", len(interview.get("questions", [])) or 10),
        "preferred_language": interview.get("preferred_language", "English"),
        "scheduled_date": interview.get("scheduled_date", ""),
        "scheduled_time": interview.get("scheduled_time", ""),
        "scheduled_timestamp": interview.get("scheduled_timestamp", 0),
        "duration_minutes": interview.get("duration_minutes", 20),
        "resume_id": interview.get("resume_id"),
        "created_at": interview.get("created_at", 0),
        "updated_at": interview.get("updated_at", 0),
    }


def interviews_helper(interviews):
    return [interview_helper(i) for i in interviews]


def user_helper(user):
    return {
        "id": str(user["_id"]),
        "name": user["name"],
        "email": user["email"],
        "is_admin": user.get("is_admin", False),
        "is_google_user": user.get("is_google_user", False),
        "avatar_url": user.get("avatar_url", None),
        "college": user.get("college", ""),
        "experience": user.get("experience", ""),
        "target_role": user.get("target_role", ""),
        "skills": user.get("skills", []),
        "resume": user.get("resume", ""),
        "created_at": user.get("created_at", 0),
    }


def users_helper(users):
    return [user_helper(u) for u in users]


# ── Module 12: Coding Interview Helpers ─────────────────────────────────────────

def coding_interview_helper(ci):
    return {
        "id": str(ci["_id"]),
        "user_id": ci.get("user_id", ""),
        "title": ci.get("title", ""),
        "description": ci.get("description", ""),
        "language": ci.get("language", "python"),
        "starter_code": ci.get("starter_code", ""),
        "test_cases": ci.get("test_cases", []),
        "user_code": ci.get("user_code", ""),
        "status": ci.get("status", "pending"),
        "score": ci.get("score", 0.0),
        "feedback": ci.get("feedback", ""),
        "execution_results": ci.get("execution_results", []),
        "created_at": ci.get("created_at", 0),
    }


def coding_interviews_helper(cis):
    return [coding_interview_helper(ci) for ci in cis]