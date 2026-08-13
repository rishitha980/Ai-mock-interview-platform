import sys, os
sys.path.insert(0, '.')
from pymongo import MongoClient
from pymongo.server_api import ServerApi
from bson import ObjectId
from datetime import datetime, timezone

uri = 'mongodb+srv://rishitharishi390_db_user:mongo123@ai-mock-interview-clust.kfmmv83.mongodb.net/?retryWrites=true&w=majority'
mongo_client = MongoClient(uri, server_api=ServerApi('1'))
db = mongo_client['ai_mock_interview_db']

# Fetch the existing resume document (keeps file_data intact)
doc = db['resumes'].find_one({'_id': ObjectId('6a5732f1648621e83d928365')})
if not doc:
    print('ERROR: document not found')
    sys.exit(1)

print('Found:', doc['filename'], '| content_type:', doc['content_type'])
print('file_data length (chars):', len(doc.get('file_data', '')))

# Re-parse using the NEW real content parser
from utils.gemini_service import parse_resume_data
new_parsed = parse_resume_data(doc['file_data'], doc['content_type'])

print()
print('=== NEW PARSED RESULTS ===')
print('name:', new_parsed.get('name'))
print('email:', new_parsed.get('email'))
print('ats_score:', new_parsed.get('ats_score'))
print('resume_quality_rating:', new_parsed.get('resume_quality_rating'))
print('skills_found_count:', new_parsed.get('skills_found_count'))
print('missing_skills_count:', new_parsed.get('missing_skills_count'))
print('projects_count:', new_parsed.get('projects_count'))
print('certifications_count:', new_parsed.get('certifications_count'))
print('experience:', new_parsed.get('experience'))
print('education:', new_parsed.get('education'))
print('suggested_role:', new_parsed.get('suggested_role'))
print('skills:', new_parsed.get('skills'))
print('strengths:', new_parsed.get('strengths'))
print('weaknesses:', new_parsed.get('weaknesses'))
print('ats_score_reason:', new_parsed.get('ats_score_reason'))

# Update the document in MongoDB with the real parsed_data
update_op = {'$set': {'parsed_data': new_parsed, 'reparsed_at': datetime.now(timezone.utc).isoformat()}}
result = db['resumes'].update_one(
    {'_id': ObjectId('6a5732f1648621e83d928365')},
    update_op
)
print()
print('MongoDB update matched:', result.matched_count, '| modified:', result.modified_count)
print('SUCCESS: Resume re-parsed and updated with real AI analysis.')
