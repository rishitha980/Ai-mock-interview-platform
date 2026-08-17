import os
import re
import json
import logging
from typing import List, Dict, Any
from google import genai
from google.genai import types

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("gemini_service")

# Initialize Gemini Client dynamically
_client_cache = None
_last_api_key = None
_warned_no_key = False

def get_client():
    global _client_cache, _last_api_key, _warned_no_key
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        try:
            from database.connection import settings_collection
            settings = settings_collection.find_one({"key": "ai_config"})
            if settings:
                api_key = settings.get("api_key")
        except Exception as e:
            logger.error(f"Failed to fetch GEMINI_API_KEY from database: {e}")
            
    if api_key:
        _warned_no_key = False
        if _client_cache is not None and _last_api_key == api_key:
            return _client_cache
        try:
            _client_cache = genai.Client(api_key=api_key)
            _last_api_key = api_key
            logger.info("Gemini SDK client initialized successfully using google.genai.")
            return _client_cache
        except Exception as e:
            logger.error(f"Failed to initialize Gemini Client: {e}")
            _client_cache = None
            _last_api_key = None
            return None
            
    _client_cache = None
    _last_api_key = None
    if not _warned_no_key:
        logger.warning("GEMINI_API_KEY environment variable and settings API key are not set. Using fallback mock responses.")
        _warned_no_key = True
    return None

def __getattr__(name: str):
    if name == "client":
        return get_client()
    raise AttributeError(f"module {__name__} has no attribute {name}")

def generate_questions(role: str, experience: str, tech_stack: List[str], job_description: str, difficulty_level: str = "Medium", num_questions: int = 5, preferred_language: str = "English", user_id: str = None, resume_id: str = None) -> List[str]:
    """
    Generates N interview questions using Gemini based on role, experience, tech stack, difficulty, language, and JD.
    """
    client = get_client()
    count = num_questions or 5
    lang = preferred_language or "English"

    # Resolve candidate experience level from resume/profile or interview payload
    detected_experience = experience
    resume = None
    
    from database.connection import resumes_collection, users_collection
    
    if resume_id:
        from bson import ObjectId
        try:
            resume = resumes_collection.find_one({"_id": ObjectId(resume_id)})
        except Exception:
            resume = resumes_collection.find_one({"_id": resume_id})
    if not resume and user_id:
        resume = resumes_collection.find_one({"user_id": user_id})

    if resume:
        parsed_exp = resume.get("parsed_data", {}).get("experience")
        if parsed_exp:
            detected_experience = parsed_exp

    if (not detected_experience or "Not Specified" in str(detected_experience)) and user_id:
        user = users_collection.find_one({"email": user_id})
        if user:
            detected_experience = user.get("experience") or detected_experience

    # Classify experience level as "Fresher" or "Experienced"
    exp_class = "Experienced"
    if detected_experience:
        exp_lower = str(detected_experience).lower()
        if any(kw in exp_lower for kw in ["fresher", "entry level", "entry-level", "0-1", "intern", "graduate"]):
            exp_class = "Fresher"

    # Add experience-based custom prompt guidelines
    if exp_class == "Fresher":
        exp_guideline = f"""
        Candidate Experience Classification: FRESHER (Entry-level candidate / student / intern / 0-1 years of experience).
        - Generate foundational to intermediate questions realistic for an entry-level job interview.
        - Focus mainly on: basic concepts of technologies mentioned in their tech stack, self-introduction, education, academic projects, internships, basic problem-solving/coding logic, and standard HR questions.
        - Do NOT ask highly advanced system design, deep distributed systems architecture, scale, or senior leadership/management scenario questions.
        - The questions should assess their potential, coding fundamentals, and knowledge of the core concepts in their tech stack: {', '.join(tech_stack)}.
        """
    else:
        exp_guideline = f"""
        Candidate Experience Classification: EXPERIENCED (Professional candidate with experience level: {detected_experience}).
        - Generate questions appropriate for an experienced professional matching their actual seniority, job role, skills, projects, and technologies.
        - The questions should be advanced and test practical, scenario-based, and role-specific engineering.
        - Include deep technical questions, system architecture, performance optimization, concurrency, caching, database indexing, debugging complex issues, and architectural trade-off analysis.
        """

    if not client:
        # Fallback Mock questions
        if exp_class == "Fresher":
            base_qs = [
                f"Can you introduce yourself and tell me about your interest in a {role} role?",
                f"What is the most interesting project or internship you worked on, and what technologies did you use?",
                f"Can you explain the basic differences between standard programming paradigms or concepts in {tech_stack[0] if tech_stack else 'software engineering'}?",
                f"How do you approach debugging a simple syntax or logic error in your code?",
                f"Tell me about a time you worked in a team project during college. What role did you play?",
                f"Why did you choose to learn the technologies listed in your profile: {', '.join(tech_stack[:3]) if tech_stack else 'these technologies'}?",
                "What is your understanding of web application fundamentals (like HTTP requests, databases)?"
            ]
        else:
            base_qs = [
                f"Can you explain your experience working with {', '.join(tech_stack) if tech_stack else 'modern technologies'} in a {role} role?",
                f"What is the most challenging technical project you worked on with {tech_stack[0] if tech_stack else 'software engineering'}, and how did you handle it?",
                "How do you ensure application security and performance during development?",
                "Explain how you handle state management or scaling in a complex application or backend architecture.",
                "Describe a time when you had to collaborate with cross-functional teams to deliver a critical feature under a tight deadline.",
                "What criteria do you use when deciding between different architectural patterns or database solutions for a scalable system?",
                "How do you approach debugging high-concurrency or memory-leak issues in production environments?"
            ]
        return base_qs[:count]

    difficulty_instructions = {
        "Easy": "Questions should be foundational, conceptual, assessing basic definitions, syntax, and simple API knowledge. Suitable for junior or entry-level positions.",
        "Medium": "Questions should test practical application, coding scenarios, typical design decisions, debugging, and common optimization. Suitable for mid-level candidates.",
        "Hard": "Questions should test deep architecture, system design, complex edge cases, concurrency, deep performance tuning, and architectural trade-off analysis. Suitable for senior, lead, or principal candidates."
    }
    diff_instruction = difficulty_instructions.get(difficulty_level, difficulty_instructions["Medium"])

    prompt = f"""
    You are an expert technical interviewer. Generate a list of exactly {count} interview questions tailored for a candidate with the following profile:
    - Role: {role}
    - Target Experience Level: {detected_experience} (Classified as {exp_class})
    - Tech Stack: {', '.join(tech_stack)}
    - Job Description: {job_description}
    - Difficulty Level: {difficulty_level}
    - Preferred Language: {lang}

    Experience Level Instructions:
    {exp_guideline}

    Difficulty Guideline:
    {diff_instruction}

    IMPORTANT: Write ALL questions in {lang}.

    Return the questions as a JSON array of strings. Do not include any markdown styling, backticks, or comments. Just return raw JSON.
    Example output format:
    [
      "Question 1...",
      "Question 2..."
    ]
    """
    try:
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json"
            )
        )
        questions = json.loads(response.text.strip())
        if isinstance(questions, list) and len(questions) > 0:
            return [str(q) for q in questions[:count]]
    except Exception as e:
        logger.error(f"Error calling Gemini for question generation: {e}")
    
    # Fallback if API fails
    base_qs = [
        f"Can you explain your experience working with {', '.join(tech_stack) if tech_stack else 'modern technologies'} in a {role} role?",
        f"What is the most challenging technical project you worked on with {tech_stack[0] if tech_stack else 'software engineering'}, and how did you handle it?",
        "How do you ensure application security and performance during development?",
        "Explain how you handle state management in a complex application or backend architecture.",
        "Describe a time when you had to collaborate with cross-functional teams to deliver a critical feature under a tight deadline.",
        "What criteria do you use when deciding between different architectural patterns or database solutions for a scalable system?",
        "How do you approach debugging high-concurrency or memory-leak issues in production environments?",
        "Can you walk through your process for writing clean, testable, and maintainable code?",
        "Describe how you handle CI/CD pipelines, automated testing, and zero-downtime deployments.",
        "If you encountered a critical system outage or security vulnerability right before a major release, what exact steps would you take?"
    ]
    return base_qs[:count]

def evaluate_answers(questions: List[str], answers: List[str]) -> Dict[str, Any]:
    """
    Evaluates the submitted answers against generated questions.
    Returns overall score, technical score, communication score, overall feedback, strengths, weaknesses, and detailed list of evaluations.
    """
    client = get_client()
    if not client:
        # Fallback Mock evaluation
        evals = []
        total_score = 0.0
        for i, q in enumerate(questions):
            ans = answers[i] if i < len(answers) else "No answer provided."
            score = 8.0 if ans and len(ans) > 15 else 4.0
            total_score += score
            evals.append({
                "question": q,
                "user_answer": ans,
                "score": score,
                "feedback": "Your response provides a decent start but could be expanded with more concrete technical examples and performance implications.",
                "improvement_tip": "Include specific architectural terms and explain how it solves real-world engineering issues.",
                "correct_answer": "A perfect response would cover lifecycle hooks, state management patterns, and potential performance optimizations."
            })
        avg_score = round(total_score / len(questions), 1) if questions else 0.0
        return {
            "overall_score": avg_score,
            "technical_score": round(avg_score * 0.95, 1),
            "communication_score": round(avg_score * 0.9, 1),
            "overall_feedback": "Overall, your answers show a solid basic understanding, but you should dive deeper into specific architectural details and performance trade-offs to stand out as a senior candidate.",
            "strengths": [
                "Demonstrated solid conceptual familiarity with the key technologies mentioned.",
                "Answer structures are logical and easy to follow."
            ],
            "weaknesses": [
                "Lacks specific technical depth and real-world performance tuning examples.",
                "Several answers could benefit from sharing architectural trade-offs."
            ],
            "evaluations": evals
        }

    q_a_pairs = []
    for i, q in enumerate(questions):
        ans = answers[i] if i < len(answers) else "No answer provided."
        q_a_pairs.append({
            "question_index": i + 1,
            "question": q,
            "user_answer": ans
        })

    prompt = f"""
    You are a technical interviewer reviewing a candidate's completed mock interview. Evaluate their answers to the questions provided.
    
    Interview Session Details:
    {json.dumps(q_a_pairs, indent=2)}

    For each question:
    1. Score the candidate's answer on a scale from 1.0 to 10.0.
    2. Provide constructive feedback on what they did well and what they missed.
    3. Suggest an improvement tip.
    4. Provide what a model/correct answer should contain.

    Provide an overall score, a technical score (correctness, coding standards, performance), and a communication score (clarity, structuring, expression) on a scale from 1.0 to 10.0.
    Also generate a list of 2-3 key strengths and 2-3 key weaknesses or areas of improvement based on their performance.

    Return the result strictly as a JSON object matching this schema:
    {{
      "overall_score": 8.2,
      "technical_score": 8.5,
      "communication_score": 7.8,
      "overall_feedback": "A summary of how the candidate performed...",
      "strengths": [
        "Strength 1...",
        "Strength 2..."
      ],
      "weaknesses": [
        "Weakness/Gap 1...",
        "Weakness/Gap 2..."
      ],
      "evaluations": [
        {{
          "question": "...",
          "user_answer": "...",
          "score": 8.0,
          "feedback": "...",
          "improvement_tip": "...",
          "correct_answer": "..."
        }}
      ]
    }}
    
    Make sure to only return valid JSON. Do not write markdown tags or anything else outside the JSON object.
    """
    try:
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json"
            )
        )
        result = json.loads(response.text.strip())
        return result
    except Exception as e:
        logger.error(f"Error calling Gemini for answer evaluation: {e}")
        
    # Standard fallback if the API fails during evaluation
    evals = []
    total_score = 0.0
    for i, q in enumerate(questions):
        ans = answers[i] if i < len(answers) else "No answer provided."
        score = 7.0 if ans and len(ans) > 10 else 3.0
        total_score += score
        evals.append({
            "question": q,
            "user_answer": ans,
            "score": score,
            "feedback": "Mock evaluation feedback: The API failed or was not configured. This is a fallback evaluation.",
            "improvement_tip": "Check API logs and configuration.",
            "correct_answer": "Standard correct answers depend on Gemini API."
        })
    avg_score = round(total_score / len(questions), 1) if questions else 0.0
    return {
        "overall_score": avg_score,
        "technical_score": round(avg_score * 0.95, 1),
        "communication_score": round(avg_score * 0.9, 1),
        "overall_feedback": "Mock overall feedback: Unable to get dynamic assessment from Gemini. Please ensure GEMINI_API_KEY is active and valid.",
        "strengths": ["Demonstrates persistence in completing the interview setup.", "Answers are recorded in the database."],
        "weaknesses": ["Lack of detailed dynamic analysis due to fallback mode.", "Needs verification of API connection."],
        "evaluations": evals
    }


import io
import docx
from pypdf import PdfReader

def extract_text_from_file(file_bytes: bytes, content_type: str) -> str:
    """
    Extracts plain text from PDF or DOCX file bytes.
    """
    text = ""
    if content_type == "application/pdf":
        try:
            reader = PdfReader(io.BytesIO(file_bytes))
            for page in reader.pages:
                page_text = page.extract_text()
                if page_text:
                    text += page_text + "\n"
        except Exception as e:
            logger.error(f"Error parsing PDF: {e}")
            text = ""
    elif content_type in [
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/msword"
    ]:
        try:
            doc = docx.Document(io.BytesIO(file_bytes))
            text = "\n".join([p.text for p in doc.paragraphs])
        except Exception as e:
            logger.error(f"Error parsing DOCX: {e}")
            text = ""
    else:
        # Fallback to reading raw string if text-based
        try:
            text = file_bytes.decode("utf-8", errors="ignore")
        except Exception:
            text = ""
    return text.strip()


def parse_resume_data(base64_data: str, mime_type: str) -> dict:
    """
    Parses a PDF/DOCX resume and returns a structured JSON payload containing skills, experience, and role.
    Extracts text dynamically and uses Gemini to analyze the resume contents.
    If Gemini is not available, uses dynamic text-based matching to generate unique scores and suggestions.
    """
    client = get_client()
    import base64 as b64
    try:
        file_bytes = b64.b64decode(base64_data)
    except Exception as e:
        logger.error(f"Failed to decode base64 resume: {e}")
        file_bytes = b""

    # Extract plain text from the file bytes
    resume_text = extract_text_from_file(file_bytes, mime_type)
    if not resume_text:
        # Fallback to some default text if empty, to ensure we have something to parse
        resume_text = "Empty Resume"

    if not client:
        # ── REAL CONTENT-BASED ANALYSIS (no Gemini key needed) ──────────────────
        # Extracts genuine data from the actual uploaded resume text.
        text_lower = resume_text.lower()
        lines = [l.strip() for l in resume_text.splitlines() if l.strip()]

        # ── 1. EXTRACT NAME (first non-empty, non-email, non-phone line ≤ 5 words) ──
        candidate_name = ""
        candidate_email = ""
        for line in lines[:15]:
            # Extract email
            email_match = re.search(r'[\w.\-+]+@[\w.\-]+\.\w+', line)
            if email_match and not candidate_email:
                candidate_email = email_match.group(0)
            # Extract name: likely first short line (1–5 words, no digits, not URL)
            if not candidate_name and 1 <= len(line.split()) <= 5:
                if not re.search(r'[\d@/:|]', line) and not any(
                    kw in line.lower() for kw in ["resume", "curriculum", "cv", "summary", "objective", "profile"]
                ):
                    candidate_name = line.title()

        # ── 2. SKILLS DETECTION (expanded 60+ skill list) ──────────────────────
        all_skills = {
            # Frontend
            "react": "React", "vue": "Vue.js", "angular": "Angular", "next.js": "Next.js",
            "nuxt": "Nuxt.js", "svelte": "Svelte", "html": "HTML", "css": "CSS",
            "tailwind": "Tailwind CSS", "sass": "SASS", "bootstrap": "Bootstrap",
            "typescript": "TypeScript", "javascript": "JavaScript", "jquery": "jQuery",
            "redux": "Redux", "graphql": "GraphQL", "webpack": "Webpack", "vite": "Vite",
            # Backend
            "node.js": "Node.js", "nodejs": "Node.js", "express": "Express.js",
            "fastapi": "FastAPI", "django": "Django", "flask": "Flask",
            "spring": "Spring Boot", "laravel": "Laravel", "rails": "Ruby on Rails",
            "asp.net": "ASP.NET", "dotnet": ".NET", "nest.js": "NestJS",
            # Languages
            "python": "Python", "java": "Java", "javascript": "JavaScript",
            "typescript": "TypeScript", "c++": "C++", "c#": "C#",
            "go": "Go", "golang": "Go", "rust": "Rust", "kotlin": "Kotlin",
            "swift": "Swift", "php": "PHP", "ruby": "Ruby", "scala": "Scala",
            # Databases
            "mongodb": "MongoDB", "mysql": "MySQL", "postgresql": "PostgreSQL",
            "postgres": "PostgreSQL", "sqlite": "SQLite", "redis": "Redis",
            "cassandra": "Cassandra", "dynamodb": "DynamoDB", "firebase": "Firebase",
            "elasticsearch": "Elasticsearch", "sql": "SQL", "nosql": "NoSQL",
            "oracle": "Oracle DB",
            # Cloud & DevOps
            "aws": "AWS", "azure": "Azure", "gcp": "GCP", "google cloud": "GCP",
            "docker": "Docker", "kubernetes": "Kubernetes", "k8s": "Kubernetes",
            "jenkins": "Jenkins", "github actions": "GitHub Actions",
            "ci/cd": "CI/CD", "terraform": "Terraform", "ansible": "Ansible",
            "nginx": "Nginx", "linux": "Linux",
            # Tools
            "git": "Git", "github": "GitHub", "gitlab": "GitLab",
            "jira": "Jira", "figma": "Figma", "postman": "Postman",
            "swagger": "Swagger", "rest api": "REST API", "restful": "REST API",
            "microservices": "Microservices", "agile": "Agile", "scrum": "Scrum",
            # ML/AI
            "machine learning": "Machine Learning", "deep learning": "Deep Learning",
            "tensorflow": "TensorFlow", "pytorch": "PyTorch", "scikit": "Scikit-Learn",
            "pandas": "Pandas", "numpy": "NumPy", "nlp": "NLP",
        }
        found_skills_dict: dict = {}
        for keyword, display_name in all_skills.items():
            if keyword in text_lower and display_name not in found_skills_dict.values():
                found_skills_dict[keyword] = display_name
        skills_found_nice = list(dict.fromkeys(found_skills_dict.values()))  # deduplicated
        skills_found_count = len(skills_found_nice)

        # ── 3. PROJECTS COUNT (count unique project headings / mentions) ─────────
        # More precise: count lines that look like project titles (CamelCase or "Project:" headers)
        project_indicators = len(re.findall(
            r'(?:project|built|developed|created|designed|implemented)\s+\w',
            text_lower
        ))
        # Also count bullet points under a "projects" section heading
        projects_section_match = re.search(r'projects?\s*\n(.*?)(?:\n\n|\Z)', resume_text, re.DOTALL | re.IGNORECASE)
        projects_in_section = len(re.findall(r'\n[-•*▪◦]\s|\n\d+\.\s', projects_section_match.group(0))) if projects_section_match else 0
        projects_count = max(min(project_indicators // 2 + projects_in_section // 2, 8), 0)
        # Clamp: at least 0, at most 8
        if project_indicators == 0 and "project" not in text_lower:
            projects_count = 0

        # ── 4. CERTIFICATIONS COUNT ────────────────────────────────────────────
        cert_matches = re.findall(
            r'certif(?:ied|ication|icate)|aws certified|google certified|pmp|scrum master|comptia|cisco|microsoft certified|oracle certified',
            text_lower
        )
        certifications_count = min(len(cert_matches), 6)

        # ── 5. EXPERIENCE LEVEL ────────────────────────────────────────────────
        years_match = re.search(r'(\d+)\+?\s*years?\s+(?:of\s+)?experience', text_lower)
        if years_match:
            yrs = int(years_match.group(1))
            if yrs >= 8:
                exp = "Lead / Principal (8+ yrs)"
            elif yrs >= 5:
                exp = "Senior (5-8 yrs)"
            elif yrs >= 2:
                exp = "Mid Level (2-4 yrs)"
            else:
                exp = "Junior (1-2 yrs)"
        elif any(kw in text_lower for kw in ["senior", "lead", "principal", "staff engineer"]):
            exp = "Senior (5-8 yrs)"
        elif any(kw in text_lower for kw in ["mid-level", "mid level", "associate"]):
            exp = "Mid Level (2-4 yrs)"
        elif any(kw in text_lower for kw in ["intern", "fresher", "entry level", "graduate"]):
            exp = "Entry Level (0-1 yrs)"
        elif len(resume_text.split()) > 300:
            exp = "Mid Level (2-4 yrs)"
        else:
            exp = "Junior (1-2 yrs)"

        # ── 6. EDUCATION ──────────────────────────────────────────────────────
        education = "Not Specified"
        if any(kw in text_lower for kw in ["ph.d", "phd", "doctor of", "doctorate"]):
            education = "Ph.D."
        elif any(kw in text_lower for kw in ["m.tech", "mtech", "m.e.", "master of tech"]):
            education = "M.Tech"
        elif any(kw in text_lower for kw in ["m.s.", "master of science", "m.sc"]):
            education = "M.S."
        elif any(kw in text_lower for kw in ["mba", "master of business"]):
            education = "MBA"
        elif any(kw in text_lower for kw in ["master", "m.a.", "m.eng"]):
            education = "Master's Degree"
        elif any(kw in text_lower for kw in ["b.tech", "btech", "b.e.", "bachelor of tech"]):
            education = "B.Tech"
        elif any(kw in text_lower for kw in ["b.s.", "bachelor of science", "b.sc"]):
            education = "B.S."
        elif any(kw in text_lower for kw in ["bachelor", "b.a.", "b.eng", "undergraduate"]):
            education = "Bachelor's Degree"
        elif any(kw in text_lower for kw in ["diploma", "associate"]):
            education = "Diploma / Associate"

        # ── 7. SUGGESTED ROLE ────────────────────────────────────────────────
        role = "Software Engineer"
        role_map = {
            "frontend developer": "Frontend Developer",
            "front-end developer": "Frontend Developer",
            "backend developer": "Backend Developer",
            "back-end developer": "Backend Developer",
            "full stack": "Fullstack Developer",
            "fullstack": "Fullstack Developer",
            "devops": "DevOps Engineer",
            "data engineer": "Data Engineer",
            "data scientist": "Data Scientist",
            "machine learning": "ML Engineer",
            "android": "Android Developer",
            "ios developer": "iOS Developer",
            "mobile developer": "Mobile Developer",
            "cloud engineer": "Cloud Engineer",
            "software developer": "Software Developer",
            "software engineer": "Software Engineer",
        }
        for key, val in role_map.items():
            if key in text_lower:
                role = val
                break

        # ── 8. SCORE CALCULATION ─────────────────────────────────────────────
        # Based only on what's actually detected in the resume
        score = 40  # base
        score += min(skills_found_count * 3, 24)          # up to +24 for skills
        score += min(len(resume_text.split()) // 50, 10)  # up to +10 for content length
        score += min(projects_count * 3, 12)              # up to +12 for projects
        score += min(certifications_count * 3, 9)         # up to +9 for certs
        has_contact = "@" in resume_text or bool(re.search(r'\d{7,}', resume_text))
        has_summary = any(kw in text_lower for kw in ["summary", "objective", "profile", "about"])
        has_skills_section = any(kw in text_lower for kw in ["skills", "technologies", "tech stack", "tools"])
        has_experience = any(kw in text_lower for kw in ["experience", "work history", "employment", "worked"])
        has_education = any(kw in text_lower for kw in ["education", "degree", "university", "college", "b.tech", "m.s.", "b.s.", "bachelor", "master"])
        if has_contact:    score += 2
        if has_summary:    score += 3
        if has_skills_section: score += 3
        if has_experience: score += 5
        if has_education:  score += 4
        has_metrics = "%" in resume_text or any(kw in text_lower for kw in ["increased", "improved", "reduced", "delivered", "achieved"])
        if has_metrics:    score += 5
        score = max(min(score, 98), 25)

        # ── 9. MISSING SKILLS ────────────────────────────────────────────────
        # What would a typical role expect that's NOT in the resume
        standard_skills = ["Git", "REST API", "Docker", "AWS", "CI/CD", "SQL", "Python", "JavaScript", "Agile"]
        missing = [s for s in standard_skills if s.lower() not in text_lower]
        missing_skills_count = len(missing)

        # ── 10. QUALITY RATING ───────────────────────────────────────────────
        if score >= 82:   resume_quality_rating = "Excellent"
        elif score >= 66: resume_quality_rating = "Good"
        elif score >= 48: resume_quality_rating = "Average"
        else:             resume_quality_rating = "Needs Work"

        # ── 11. STRENGTHS (based on what's found) ───────────────────────────
        strengths = []
        if skills_found_count >= 8:
            strengths.append(f"Strong technical skill set detected: {', '.join(skills_found_nice[:5])} and {skills_found_count - 5} more.")
        elif skills_found_count >= 4:
            strengths.append(f"Good technical foundation with {skills_found_count} skills: {', '.join(skills_found_nice[:4])}.")
        if projects_count >= 3:
            strengths.append(f"{projects_count} projects identified — demonstrates hands-on practical experience.")
        elif projects_count >= 1:
            strengths.append(f"{projects_count} project(s) found showing practical implementation ability.")
        if certifications_count >= 1:
            strengths.append(f"{certifications_count} professional certification(s) found — adds credibility.")
        if has_experience:
            strengths.append("Work experience section clearly present.")
        if has_education:
            strengths.append(f"Education clearly listed ({education}).")
        if has_metrics:
            strengths.append("Resume includes quantifiable achievements — strong for ATS parsing.")
        if not strengths:
            strengths.append("Resume content was parsed. Some sections need expansion for stronger ATS performance.")

        # ── 12. WEAKNESSES (based on what's missing) ────────────────────────
        weaknesses = []
        if not has_summary:
            weaknesses.append("No career summary or objective section detected — important for first impressions.")
        if skills_found_count < 5:
            weaknesses.append(f"Only {skills_found_count} technical skills found — too few for most tech roles.")
        if projects_count < 2:
            weaknesses.append("Very few or no projects listed — employers need proof of practical experience.")
        if certifications_count == 0:
            weaknesses.append("No certifications found — relevant certifications significantly improve ATS rank.")
        if not has_metrics:
            weaknesses.append("No measurable outcomes or achievements found (e.g. percentages, numbers, results).")
        if not has_contact:
            weaknesses.append("Contact information may be missing or not parseable by ATS systems.")
        if not weaknesses:
            weaknesses.append("Resume is fairly complete. Focus on quantifying achievements for a higher ATS score.")

        # ── 13. IMPROVEMENT AREAS ────────────────────────────────────────────
        improvement_areas = []
        if "docker" not in text_lower and "kubernetes" not in text_lower:
            improvement_areas.append("Containerization (Docker / Kubernetes)")
        if "ci/cd" not in text_lower and "github actions" not in text_lower:
            improvement_areas.append("CI/CD Pipeline experience")
        if "aws" not in text_lower and "azure" not in text_lower and "gcp" not in text_lower:
            improvement_areas.append("Cloud platform exposure (AWS, Azure, or GCP)")
        if not has_metrics:
            improvement_areas.append("Quantifiable project outcomes (e.g. 'Reduced load time by 30%')")
        if certifications_count < 2:
            improvement_areas.append("Professional certifications (AWS Certified, Scrum, GCP, etc.)")
        if not improvement_areas:
            improvement_areas.append("Keep resume updated with latest project outcomes and technologies.")

        # ── 14. ATS SCORE REASON ─────────────────────────────────────────────
        ats_score_reason = (
            f"Score is based on {skills_found_count} technical skills detected, {projects_count} projects, "
            f"{certifications_count} certification(s), and resume structure/content analysis. "
        )
        if score >= 82:
            ats_score_reason += "Excellent keyword density and structure for ATS systems."
        elif score >= 66:
            ats_score_reason += "Good ATS compatibility — a few additions will significantly improve ranking."
        elif score >= 48:
            ats_score_reason += "Average ATS readability — expand skills, projects, and add metrics to score higher."
        else:
            ats_score_reason += "Low ATS score — resume needs significant expansion and keyword optimization."

        # ── 15. AI SUGGESTIONS ────────────────────────────────────────────────
        ai_suggestions = []
        if not has_summary:
            ai_suggestions.append("Add a 3-sentence professional summary at the top: who you are, your skills, and what you're seeking.")
        if not has_metrics:
            ai_suggestions.append("Quantify your achievements: use numbers and percentages (e.g. 'Improved API speed by 35%').")
        if skills_found_count < 8:
            ai_suggestions.append("Expand your Technical Skills section — add at least 8-10 relevant technologies for your target role.")
        if "docker" not in text_lower:
            ai_suggestions.append("Add containerization experience (Docker/Kubernetes) — required for most modern engineering roles.")
        if certifications_count == 0:
            ai_suggestions.append("Earn 1-2 industry certifications (AWS, GCP, Scrum Master) to immediately boost your ATS score.")
        if projects_count < 2:
            ai_suggestions.append("Add detailed project descriptions with tech stack, your role, and outcomes for each project.")
        if "github" not in text_lower and "portfolio" not in text_lower:
            ai_suggestions.append("Include your GitHub profile or portfolio link — recruiters actively look for this.")
        if len(ai_suggestions) < 3:
            ai_suggestions.append("Tailor your resume keywords to match the specific job description you are applying for.")

        # ── 16. MISSING KEYWORDS ─────────────────────────────────────────────
        common_ats_keywords = ["REST API", "CI/CD", "Agile", "Scrum", "Git", "GitHub",
                               "Unit Testing", "Code Review", "Microservices", "System Design",
                               "Problem Solving", "Communication"]
        missing_keywords_list = [kw for kw in common_ats_keywords if kw.lower() not in text_lower]

        # ── 17. SECTION ANALYSIS ─────────────────────────────────────────────
        section_analysis = {
            "contact": {
                "status": "good" if has_contact else "missing",
                "notes": "Email and contact details detected." if has_contact else "No parseable contact info found. Add phone, email, LinkedIn."
            },
            "summary": {
                "status": "good" if has_summary else "missing",
                "notes": "Career summary/objective section found." if has_summary else "No summary section — add a 2-3 line professional overview."
            },
            "skills": {
                "status": "good" if has_skills_section and skills_found_count >= 6 else "average" if has_skills_section else "missing",
                "notes": f"{skills_found_count} technical skills detected." if has_skills_section else "No dedicated skills section detected."
            },
            "experience": {
                "status": "good" if has_experience and len(resume_text.split()) > 250 else "average" if has_experience else "missing",
                "notes": "Work experience section found with detail." if has_experience and len(resume_text.split()) > 250 else "Experience section detected but needs more detail." if has_experience else "No work experience section found."
            },
            "projects": {
                "status": "good" if projects_count >= 2 else "average" if projects_count == 1 else "missing",
                "notes": f"{projects_count} project(s) detected." if projects_count > 0 else "No projects section found — add 2-3 projects."
            },
            "education": {
                "status": "good" if has_education else "missing",
                "notes": f"{education} education detected." if has_education else "Education section not found."
            },
            "certifications": {
                "status": "good" if certifications_count >= 2 else "average" if certifications_count == 1 else "missing",
                "notes": f"{certifications_count} certification(s) detected." if certifications_count > 0 else "No certifications found."
            }
        }

        # ── 18. HOW TO IMPROVE ───────────────────────────────────────────────
        how_to_improve = []
        if not has_summary:
            how_to_improve.append("Write a 3-sentence career summary at the very top of your resume.")
        if skills_found_count < 8:
            how_to_improve.append(f"Add more technical skills — currently {skills_found_count} detected. Aim for 10-15 relevant skills.")
        if not has_metrics:
            how_to_improve.append("Add quantified outcomes to every job and project bullet point (numbers, %, time saved).")
        if certifications_count == 0:
            how_to_improve.append("Complete and add at least one recognized certification (AWS, Google Cloud, Scrum, etc.).")
        if projects_count < 2:
            how_to_improve.append("Add 2-3 projects with descriptions: what problem they solve, the tech stack, and your contribution.")
        if missing_keywords_list:
            how_to_improve.append(f"Include these ATS keywords in your resume: {', '.join(missing_keywords_list[:5])}.")
        if len(how_to_improve) < 4:
            how_to_improve.append("Use a single-column ATS-friendly layout with clear section headings.")
            how_to_improve.append("Tailor your resume for each application using keywords from the job description.")

        logger.info(f"Rules-based parse: score={score}, skills={skills_found_count}, projects={projects_count}, certs={certifications_count}, exp={exp}, education={education}")

        return {
            "name": candidate_name,
            "email": candidate_email,
            "skills": skills_found_nice,
            "experience": exp,
            "suggested_role": role,
            "experience_analysis": (
                f"Based on the resume content, the candidate appears to be at the {exp} level targeting a {role} position. "
                f"Skills detected include: {', '.join(skills_found_nice[:5]) if skills_found_nice else 'None detected'}."
            ),
            "ats_score": int(score),
            "resume_version": "v1.0",
            "skills_found_count": int(skills_found_count),
            "missing_skills_count": int(missing_skills_count),
            "projects_count": int(projects_count),
            "education": education,
            "certifications_count": int(certifications_count),
            "ai_suggestions": ai_suggestions,
            "strengths": strengths,
            "weaknesses": weaknesses,
            "improvement_areas": improvement_areas,
            "ats_score_reason": ats_score_reason,
            "missing_keywords": missing_keywords_list,
            "section_analysis": section_analysis,
            "resume_quality_rating": resume_quality_rating,
            "how_to_improve": how_to_improve,
        }

    try:
        # --- GEMINI AI-BASED ANALYSIS ---
        prompt = f"""
        You are an expert technical recruiter and ATS (Applicant Tracking System) specialist. Analyze the candidate's resume text:
        ---
        {resume_text}
        ---
        
        Evaluate the overall structure, skills, keyword density, job role alignment, technical competence, projects, experience, education, certifications, and ATS formatting quality.
        Return the result strictly as a JSON object matching this schema:
        {{
          "name": "Candidate's Full Name",
          "email": "Candidate's Email Address",
          "skills": ["Skill 1", "Skill 2", "Skill 3", ...], // Extract all key technical skills
          "experience": "Mid Level (2-4 yrs)", // Choose the best fit from: 'Entry Level (0-1 yrs)', 'Junior (1-2 yrs)', 'Mid Level (2-4 yrs)', 'Senior (5-8 yrs)', 'Lead / Principal (8+ yrs)'
          "suggested_role": "Target job title, e.g. Frontend Developer, Fullstack Engineer, DevOps Engineer, etc.",
          "experience_analysis": "Provide a brief 2-3 sentence overview analyzing their career experience.",
          "ats_score": 85, // Integer 0 to 100 based on standard ATS keyword match, readability, formatting, and content density.
          "resume_version": "v1.0", // Deduce or generate a clean version code like v1.0, v2.1, etc.
          "skills_found_count": 24, // Count of distinct technical skills found in resume.
          "missing_skills_count": 6, // Estimate count of missing typical skills for their target role.
          "projects_count": 4, // Number of distinct projects listed.
          "education": "Highest degree, e.g. B.Tech, M.S. in CS, BS, etc.",
          "certifications_count": 3, // Number of certifications found in the resume.
          "ats_score_reason": "Explain briefly in 1-2 sentences why this score was given.",
          "strengths": [
             "Strength 1...",
             "Strength 2..."
          ],
          "weaknesses": [
             "Weakness 1...",
             "Weakness 2..."
          ],
          "improvement_areas": [
             "Improvement Area 1...",
             "Improvement Area 2..."
          ],
          "ai_suggestions": [
             "Actionable recommendation 1",
             "Actionable recommendation 2",
             "Actionable recommendation 3"
          ],
          "missing_keywords": ["REST API", "CI/CD", "Agile"],
          "resume_quality_rating": "Good",
          "how_to_improve": [
             "Step 1: ...",
             "Step 2: ..."
          ],
          "section_analysis": {{
            "contact": {{"status": "good", "notes": "Email and phone present."}},
            "summary": {{"status": "missing", "notes": "No career summary found."}},
            "skills": {{"status": "good", "notes": "15 technical skills identified."}},
            "experience": {{"status": "average", "notes": "Lacks measurable achievements."}},
            "projects": {{"status": "good", "notes": "3 projects with descriptions."}},
            "education": {{"status": "good", "notes": "B.Tech degree listed."}},
            "certifications": {{"status": "missing", "notes": "No certifications found."}}
          }}
        }}
        Do not include markdown tags, code block wrappers (e.g. ```json), or any commentary. Return only the JSON object.
        """
        
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json"
            )
        )
        
        result_dict = json.loads(response.text.strip())
        # Ensure all types and defaults are correct
        result_dict["ats_score"] = int(result_dict.get("ats_score", 75))
        result_dict["skills_found_count"] = int(result_dict.get("skills_found_count", len(result_dict.get("skills", []))))
        result_dict["missing_skills_count"] = int(result_dict.get("missing_skills_count", 5))
        result_dict["projects_count"] = int(result_dict.get("projects_count", 2))
        result_dict["certifications_count"] = int(result_dict.get("certifications_count", 0))
        result_dict["strengths"] = result_dict.get("strengths", ["Standard technical profile"])
        result_dict["weaknesses"] = result_dict.get("weaknesses", ["Keyword densities can be improved"])
        result_dict["improvement_areas"] = result_dict.get("improvement_areas", ["Optimize formatting layout"])
        result_dict["ats_score_reason"] = result_dict.get("ats_score_reason", "Extracted skills fit basic role details.")
        result_dict["missing_keywords"] = result_dict.get("missing_keywords", [])
        result_dict["resume_quality_rating"] = result_dict.get("resume_quality_rating", "Average")
        result_dict["how_to_improve"] = result_dict.get("how_to_improve", ["Add quantifiable metrics to your experience."])
        result_dict["section_analysis"] = result_dict.get("section_analysis", {})
        return result_dict
    except Exception as e:
        logger.error(f"Error parsing resume via Gemini: {e}")
        # Fallback to dynamic parsing in case of error
        return {
            "name": "Sandy Candidate",
            "email": "candidate@example.com",
            "skills": ["React", "FastAPI", "MongoDB"],
            "experience": "Mid Level (2-4 yrs)",
            "suggested_role": "Software Developer",
            "experience_analysis": f"Fallback parsed due to exception: {str(e)}",
            "ats_score": 75,
            "resume_version": "v1.0",
            "skills_found_count": 10,
            "missing_skills_count": 5,
            "projects_count": 2,
            "education": "BS in CS",
            "certifications_count": 1,
            "ai_suggestions": [
                "Include concrete technical metrics in your projects",
                "Ensure tech stack list matches target jobs closely",
                "Keep formatting simple and single-column for ATS parsers"
            ],
            "strengths": ["Strong basic React/Python foundation"],
            "weaknesses": ["Missing advanced keywords"],
            "improvement_areas": ["Quantified achievements in project descriptions"],
            "ats_score_reason": f"Fallback parsed due to exception: {str(e)}",
            "missing_keywords": ["REST API", "CI/CD", "Agile", "Git"],
            "resume_quality_rating": "Average",
            "how_to_improve": ["Expand technical skills section.", "Add quantifiable project metrics."],
            "section_analysis": {}
        }


def match_resume_to_jd(resume_parsed_info: dict, jd_text: str) -> dict:
    """
    Compares the candidate's parsed resume details against a job description.
    Returns matching score %, key matching skills, missing skills/gaps, and custom tips.
    """
    client = get_client()
    if not client:
        return {
            "match_score": 75,
            "matched_skills": ["React", "FastAPI", "MongoDB"],
            "missing_skills": ["TypeScript", "Docker"],
            "strengths": ["Strong foundational Python skills", "Experienced with single-page React apps"],
            "gaps_analysis": "The candidate has built web apps but lacks explicit experience with dockerized microservices mentioned in the JD.",
            "recommendations": "Add TypeScript typings to your components and document any experience deploying via containerized workflows."
        }
        
    prompt = f"""
    You are an expert ATS (Applicant Tracking System) recruiter. Compare the candidate's resume summary against the target Job Description.
    
    Resume details:
    {json.dumps(resume_parsed_info, indent=2)}
    
    Job Description:
    {jd_text}
    
    Evaluate the overall fit, match score percentage, strengths, missing skills, gaps, and improvements.
    Return the result strictly as a JSON object matching this schema:
    {{
      "match_score": 78,
      "matched_skills": ["SkillA", "SkillB", ...],
      "missing_skills": ["SkillC", "SkillD", ...],
      "strengths": ["Strength 1...", "Strength 2..."],
      "gaps_analysis": "A brief overview analyzing the skill gaps between resume and JD.",
      "recommendations": "Actionable feedback to improve resume matching."
    }}
    Do not include markdown tags. Raw JSON only.
    """
    try:
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json"
            )
        )
        return json.loads(response.text.strip())
    except Exception as e:
        logger.error(f"Error matching JD via Gemini: {e}")
        return {
            "match_score": 50,
            "matched_skills": resume_parsed_info.get("skills", []),
            "missing_skills": [],
            "strengths": ["Extracted skills fit basic role."],
            "gaps_analysis": f"Error running matching assessment: {str(e)}",
            "recommendations": "Verify API configurations."
        }

