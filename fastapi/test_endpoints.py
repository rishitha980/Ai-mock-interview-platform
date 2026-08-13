import requests
import random
import sys

BASE_URL = "http://localhost:8000"

def run_tests():
    print("==================================================")
    print("      Starting E2E AI Mock Interview Tests        ")
    print("==================================================")

    # 1. Sign Up a new user
    email = f"testuser_{random.randint(1000, 9999)}@example.com"
    password = "testpassword123"
    name = "Test Candidate"

    print(f"\n[1] Registering user: {email}...")
    signup_url = f"{BASE_URL}/signup"
    signup_payload = {
        "name": name,
        "email": email,
        "password": password
    }
    res = requests.post(signup_url, json=signup_payload)
    print(f"Status Code: {res.status_code}")
    print(f"Response: {res.json()}")
    if res.status_code != 200:
        print("[ERROR] Signup failed!")
        sys.exit(1)
    print("[OK] Signup successful.")

    # 2. Log In
    print(f"\n[2] Logging in...")
    login_url = f"{BASE_URL}/login"
    login_payload = {
        "email": email,
        "password": password
    }
    res = requests.post(login_url, json=login_payload)
    print(f"Status Code: {res.status_code}")
    response_data = res.json()
    print(f"Response: {response_data}")
    if res.status_code != 200 or "access_token" not in response_data:
        print("[ERROR] Login failed!")
        sys.exit(1)
    
    token = response_data["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    print("[OK] Login successful. JWT token acquired.")

    # 3. Create Interview
    print(f"\n[3] Creating new mock interview...")
    create_url = f"{BASE_URL}/interviews"
    interview_payload = {
        "role": "Fullstack Software Engineer",
        "experience": "Mid Level (2-4 yrs)",
        "tech_stack": ["React", "FastAPI", "MongoDB"],
        "job_description": "We are seeking a developer to design and deploy highly scalable Python APIs and React web interfaces."
    }
    res = requests.post(create_url, json=interview_payload, headers=headers)
    print(f"Status Code: {res.status_code}")
    interview_data = res.json()
    print(f"Response: {interview_data}")
    if res.status_code != 200 or "id" not in interview_data:
        print("[ERROR] Interview creation failed!")
        sys.exit(1)
    
    interview_id = interview_data["id"]
    questions = interview_data["questions"]
    print(f"[OK] Interview created successfully. ID: {interview_id}")
    print(f"Generated Questions: {questions}")

    # 4. Fetch Interview Details
    print(f"\n[4] Fetching interview details...")
    fetch_url = f"{BASE_URL}/interviews/{interview_id}"
    res = requests.get(fetch_url, headers=headers)
    print(f"Status Code: {res.status_code}")
    print(f"Response: {res.json()}")
    if res.status_code != 200:
        print("[ERROR] Fetching interview details failed!")
        sys.exit(1)
    print("[OK] Interview details fetched successfully.")

    # 5. Submit Answers
    print(f"\n[5] Submitting answers for evaluation...")
    submit_url = f"{BASE_URL}/interviews/{interview_id}/submit"
    submission_payload = {
        "answers": [
            {"question": questions[0], "answer": "I have used React to build reusable components, managing local state with hooks and global state with Context API."},
            {"question": questions[1], "answer": "FastAPI is great because of its asynchronous capabilities, auto-generated OpenAPI documentation, and fast Pydantic schema validation."},
            {"question": questions[2], "answer": "MongoDB uses a document-oriented structure, stores data in BSON format, and connects using PyMongo MongoClient connection string."},
            {"question": questions[3], "answer": "I would optimize by using indexing, minimizing payload sizes, utilizing lazy loading, and caching frequently needed query results."},
            {"question": questions[4], "answer": "I would resolve it by discussing details with other developers, aligning on shared interface contracts, and running integration tests early."}
        ]
    }
    res = requests.post(submit_url, json=submission_payload, headers=headers)
    print(f"Status Code: {res.status_code}")
    submit_data = res.json()
    print(f"Response keys: {submit_data.keys()}")
    if res.status_code != 200 or "result" not in submit_data:
        print("[ERROR] Answer submission failed!")
        sys.exit(1)
    print("[OK] Answer submission and evaluation successful.")
    print(f"Overall Score: {submit_data['result']['overall_score']}")
    print(f"Overall Feedback: {submit_data['result']['overall_feedback']}")

    # 6. Fetch Results Report
    print(f"\n[6] Fetching result report...")
    result_url = f"{BASE_URL}/interviews/{interview_id}/result"
    res = requests.get(result_url, headers=headers)
    print(f"Status Code: {res.status_code}")
    print(f"Response keys: {res.json().keys()}")
    if res.status_code != 200:
        print("[ERROR] Fetching results report failed!")
        sys.exit(1)
    print("[OK] Results report verified.")

    # 7. Check Dashboard Stats
    print(f"\n[7] Retrieving dashboard stats...")
    stats_url = f"{BASE_URL}/dashboard/stats"
    res = requests.get(stats_url, headers=headers)
    print(f"Status Code: {res.status_code}")
    print(f"Response: {res.json()}")
    if res.status_code != 200:
        print("[ERROR] Dashboard stats failed!")
        sys.exit(1)
    print("[OK] Dashboard stats verified.")

    # 8. Test Profile Endpoints
    print("\n[8] Testing Profile CRUD endpoints...")
    profile_url = f"{BASE_URL}/profile"
    res = requests.get(profile_url, headers=headers)
    print(f"GET Profile Status: {res.status_code}")
    print(f"Response: {res.json()}")
    if res.status_code != 200:
        print("[ERROR] GET Profile failed!")
        sys.exit(1)
    
    # Update profile name
    update_payload = {"name": "Updated Test Candidate Name"}
    res = requests.put(profile_url, json=update_payload, headers=headers)
    print(f"PUT Profile Status: {res.status_code}")
    print(f"Response: {res.json()}")
    if res.status_code != 200 or res.json().get("user", {}).get("name") != "Updated Test Candidate Name":
        print("[ERROR] PUT Profile failed!")
        sys.exit(1)
    print("[OK] Profile CRUD verified.")

    # 9. Test Notifications Endpoints
    print("\n[9] Testing Notifications center endpoints...")
    notif_url = f"{BASE_URL}/notifications"
    res = requests.get(notif_url, headers=headers)
    print(f"GET Notifications Status: {res.status_code}")
    notifs = res.json()
    print(f"Response: {notifs}")
    if res.status_code != 200:
        print("[ERROR] GET Notifications failed!")
        sys.exit(1)
    
    if len(notifs) > 0:
        notif_id = notifs[0]["id"]
        read_url = f"{BASE_URL}/notifications/{notif_id}/read"
        res = requests.put(read_url, headers=headers)
        print(f"PUT Read Notification Status: {res.status_code}")
        print(f"Response: {res.json()}")
        if res.status_code != 200:
            print("[ERROR] Marking notification as read failed!")
            sys.exit(1)
    print("[OK] Notifications center verified.")

    # 10. Test Unauthorized Admin Access Block
    print("\n[10] Verifying Administrative router security blocks...")
    admin_url = f"{BASE_URL}/admin/stats"
    res = requests.get(admin_url, headers=headers)
    print(f"GET Admin Stats (Expect 403): {res.status_code}")
    print(f"Response: {res.json()}")
    if res.status_code != 403:
        print("[ERROR] Admin access was not blocked for non-admin user!")
        sys.exit(1)
    print("[OK] Administrative security boundaries confirmed.")

    # 11. Test Notification Reminders
    print("\n[11] Testing pending interview notifications & email reminders...")
    remind_url = f"{BASE_URL}/notifications/remind"
    res = requests.post(remind_url, headers=headers)
    print(f"Status Code: {res.status_code}")
    print(f"Response: {res.json()}")
    if res.status_code != 200:
        print("[ERROR] Reminders endpoint failed!")
        sys.exit(1)
    print("[OK] Reminders endpoint verified.")

    # 12. Delete Interview Record
    print(f"\n[12] Deleting interview record...")
    delete_url = f"{BASE_URL}/interviews/{interview_id}"
    res = requests.delete(delete_url, headers=headers)
    print(f"Status Code: {res.status_code}")
    print(f"Response: {res.json()}")
    if res.status_code != 200:
        print("[ERROR] Interview deletion failed!")
        sys.exit(1)
    print("[OK] Interview deletion successful.")

    # 13. Skip Google OAuth SSO Authentication (Mock bypass removed for security)
    print("\n[13] Google OAuth SSO authentication mock bypass has been removed. Authenticating subsequent tests with standard user headers...")
    google_headers = headers
    print("[OK] Reused standard user JWT headers.")

    # 14. Test Coding Interview challenge generation
    print("\n[14] Creating a new coding interview challenge...")
    coding_create_url = f"{BASE_URL}/coding-interviews"
    coding_payload = {
        "topic": "Arrays & Hashing",
        "difficulty": "Easy",
        "language": "python"
    }
    res = requests.post(coding_create_url, json=coding_payload, headers=google_headers)
    print(f"Status Code: {res.status_code}")
    coding_data = res.json()
    print(f"Response keys: {coding_data.keys()}")
    if res.status_code != 200 or "challenge" not in coding_data:
        print("[ERROR] Coding challenge generation failed!")
        sys.exit(1)
    
    coding_id = coding_data["challenge"]["id"]
    starter_code = coding_data["challenge"]["starter_code"]
    test_cases = coding_data["challenge"]["test_cases"]
    print(f"[OK] Coding challenge created. ID: {coding_id}")
    print(f"Starter Code: {starter_code}")
    print(f"Test cases count: {len(test_cases)}")

    # 15. Test Code Run Sandbox Execution
    print("\n[15] Running solution code in Sandbox...")
    # Use a generic code that copies stdin to stdout to verify subprocess execution
    user_code = "import sys\nfor line in sys.stdin:\n    print(line.strip(), end='')\n"
    run_url = f"{BASE_URL}/coding-interviews/{coding_id}/run"
    run_payload = {
        "code": user_code,
        "language": "python"
    }
    res = requests.post(run_url, json=run_payload, headers=google_headers)
    print(f"Status Code: {res.status_code}")
    run_res_data = res.json()
    print(f"Response: {run_res_data.get('message', '')}")
    if res.status_code != 200 or "results" not in run_res_data:
        print("[ERROR] Coding sandbox run failed!")
        sys.exit(1)
    print("[OK] Coding sandbox runner verified.")

    # 16. Test Code Submission & AI Review
    print("\n[16] Submitting code for AI evaluation and feedback...")
    submit_url = f"{BASE_URL}/coding-interviews/{coding_id}/submit"
    submit_payload = {
        "code": starter_code or "# Python starter code\nprint('starting')",
        "language": "python"
    }
    res = requests.post(submit_url, json=submit_payload, headers=google_headers)
    print(f"Status Code: {res.status_code}")
    submit_res_data = res.json()
    print(f"Response keys: {submit_res_data.keys()}")
    if res.status_code != 200 or "score" not in submit_res_data:
        print("[ERROR] Coding submission evaluation failed!")
        sys.exit(1)
    print(f"[OK] Code submission completed. Score: {submit_res_data.get('score')}")
    print(f"Feedback: {submit_res_data.get('feedback')}")

    # 17. Test file upload and storage module
    print("\n[17] Testing File Upload and Storage module...")
    upload_url = f"{BASE_URL}/storage/upload"
    
    # Test valid upload
    print("Uploading valid small txt file...")
    files = {"file": ("test_file.txt", b"Hello, this is a test upload file.", "text/plain")}
    res = requests.post(upload_url, files=files, headers=google_headers)
    print(f"Valid upload Status Code: {res.status_code}")
    upload_data = res.json()
    print(f"Response: {upload_data}")
    if res.status_code != 200 or "url" not in upload_data:
        print("[ERROR] Valid file upload failed!")
        sys.exit(1)
    
    # Test invalid extension (e.g. .exe)
    print("Uploading blocked file extension (.exe)...")
    bad_files = {"file": ("malicious.exe", b"dangerous bytes", "application/x-msdownload")}
    res = requests.post(upload_url, files=bad_files, headers=google_headers)
    print(f"Blocked upload Status Code: {res.status_code} (Expect 400)")
    if res.status_code != 400:
        print("[ERROR] Upload of restricted extension was not blocked!")
        sys.exit(1)
    
    # Test size limit exceeding (> 5MB)
    print("Uploading file exceeding 5MB limit...")
    large_bytes = b"0" * (6 * 1024 * 1024) # 6MB
    large_files = {"file": ("large_file.txt", large_bytes, "text/plain")}
    res = requests.post(upload_url, files=large_files, headers=google_headers)
    print(f"Large upload Status Code: {res.status_code} (Expect 400)")
    if res.status_code != 400:
        print("[ERROR] Upload of oversized file was not blocked!")
        sys.exit(1)
    print("[OK] File storage and validation verified.")

    # 18. Clean up coding challenge session
    print("\n[18] Deleting coding interview session...")
    coding_delete_url = f"{BASE_URL}/coding-interviews/{coding_id}"
    res = requests.delete(coding_delete_url, headers=google_headers)
    print(f"Status Code: {res.status_code}")
    if res.status_code != 200:
        print("[ERROR] Coding interview session deletion failed!")
        sys.exit(1)
    print("[OK] Coding interview deletion successful.")

    print("\n==================================================")
    print("      ALL ENDPOINT INTEGRATION TESTS PASSED!       ")
    print("==================================================")

if __name__ == "__main__":
    run_tests()
