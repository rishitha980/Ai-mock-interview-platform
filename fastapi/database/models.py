from pydantic import BaseModel, Field
from datetime import datetime
from typing import List, Optional

def get_current_timestamp():
    return int(datetime.timestamp(datetime.now()))

class User(BaseModel):
    name: str
    email: str
    password: str
    is_admin: bool = False
    is_google_user: bool = False
    avatar_url: Optional[str] = None
    created_at: int = Field(default_factory=get_current_timestamp)

class UserLogin(BaseModel):
    email: str
    password: str

class UserProfileUpdate(BaseModel):
    name: Optional[str] = None
    password: Optional[str] = None
    college: Optional[str] = None
    experience: Optional[str] = None
    target_role: Optional[str] = None
    skills: Optional[List[str]] = None
    resume: Optional[str] = None

class InterviewCreate(BaseModel):
    role: str
    experience: str
    tech_stack: List[str]
    job_description: str
    difficulty_level: str = "Medium"
    company_name: Optional[str] = None
    interview_type: Optional[str] = "Technical"
    num_questions: Optional[int] = 10
    preferred_language: Optional[str] = "English"
    scheduled_date: Optional[str] = None
    scheduled_time: Optional[str] = None
    scheduled_timestamp: Optional[int] = None
    duration_minutes: Optional[int] = 20
    resume_id: Optional[str] = None

class Interview(BaseModel):
    user_id: str
    role: str
    experience: str
    tech_stack: List[str]
    job_description: str
    difficulty_level: str = "Medium"
    company_name: Optional[str] = None
    interview_type: Optional[str] = "Technical"
    num_questions: Optional[int] = 10
    preferred_language: Optional[str] = "English"
    scheduled_date: Optional[str] = None
    scheduled_time: Optional[str] = None
    scheduled_timestamp: Optional[int] = None
    duration_minutes: Optional[int] = 20
    questions: List[str] = []
    score: float = 0.0
    feedback: str = ""
    status: str = "scheduled"
    resume_id: Optional[str] = None
    created_at: int = Field(default_factory=get_current_timestamp)
    updated_at: int = Field(default_factory=get_current_timestamp)

class Answer(BaseModel):
    question: str
    answer: str

class AnswerSubmission(BaseModel):
    answers: List[Answer]

# ── Module 12: Coding Interview Models ──────────────────────────────────────────

class CodingInterviewCreate(BaseModel):
    language: str = "python"
    difficulty: str = "Medium"
    topic: str = "Data Structures & Algorithms"

class CodingInterview(BaseModel):
    user_id: str
    title: str
    description: str
    language: str = "python"
    starter_code: str = ""
    test_cases: List[dict] = []
    user_code: str = ""
    status: str = "pending"
    score: float = 0.0
    feedback: str = ""
    execution_results: List[dict] = []
    created_at: int = Field(default_factory=get_current_timestamp)

class CodeRunRequest(BaseModel):
    code: str
    language: str = "python"

class CodeSubmitRequest(BaseModel):
    code: str
    language: str = "python"