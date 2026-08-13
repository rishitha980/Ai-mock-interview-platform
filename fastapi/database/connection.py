import os
from dotenv import load_dotenv
from pymongo import MongoClient
from pymongo.server_api import ServerApi

# Find and load the .env file
load_dotenv()

uri = os.getenv("MONGO_URI", "mongodb+srv://rishitharishi390_db_user:mongo123@ai-mock-interview-clust.kfmmv83.mongodb.net/?retryWrites=true&w=majority")

client = MongoClient(uri, server_api=ServerApi('1'))

db = client["ai_mock_interview_db"]

interviews_collection = db["interviews"]
users_collection = db["users"]
feedback_collection = db["feedback"]
results_collection = db["interview_results"]
# ── NEW collections (resume upload feature) ──────────────────────────────────
resumes_collection = db["resumes"]
job_descriptions_collection = db["job_descriptions"]
notifications_collection = db["notifications"]
coding_interviews_collection = db["coding_interviews"]
settings_collection = db["settings"]

print("MongoDB Connected")

