import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime

# Configure logs directory if SMTP is disabled
LOGS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "logs")

def send_email_report(to_email: str, subject: str, html_body: str) -> bool:
    """
    Sends an email report to the user.
    If SMTP server configurations are not found, it automatically falls back
    to logging the email details into a local log file inside fastapi/logs/.
    """
    smtp_host = os.getenv("SMTP_HOST")
    smtp_port = os.getenv("SMTP_PORT", "587")
    smtp_user = os.getenv("SMTP_USER")
    smtp_password = os.getenv("SMTP_PASSWORD")
    smtp_from = os.getenv("SMTP_FROM", "noreply@aimockinterview.com")

    # If SMTP is configured, attempt sending
    if smtp_host and smtp_user and smtp_password:
        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = smtp_from
            msg["To"] = to_email

            part = MIMEText(html_body, "html")
            msg.attach(part)

            # Start connection
            server = smtplib.SMTP(smtp_host, int(smtp_port))
            server.starttls()
            server.login(smtp_user, smtp_password)
            server.sendmail(smtp_from, to_email, msg.as_string())
            server.quit()
            print(f"[EMAIL] Sent report successfully via SMTP to {to_email}")
            return True
        except Exception as e:
            print(f"[EMAIL ERROR] Failed sending SMTP mail: {e}. Falling back to file logs.")
            # Fall through to logger fallback

    # Fallback to local logger file
    try:
        os.makedirs(LOGS_DIR, exist_ok=True)
        log_path = os.path.join(LOGS_DIR, "sent_emails.log")
        
        timestamp = datetime.now().isoformat()
        with open(log_path, "a", encoding="utf-8") as f:
            f.write(f"=== EMAIL RECORDED AT {timestamp} ===\n")
            f.write(f"TO: {to_email}\n")
            f.write(f"FROM: {smtp_from}\n")
            f.write(f"SUBJECT: {subject}\n")
            f.write(f"BODY:\n{html_body}\n")
            f.write("=" * 60 + "\n\n")
            
        print(f"[EMAIL] Offline backup saved to {log_path} for {to_email}")
        return True
    except Exception as e:
        print(f"[EMAIL SYSTEM ERROR] Failed writing offline backup: {e}")
        return False

def send_interview_report_email(
    to_email: str, 
    role: str, 
    difficulty: str,
    overall_score: float, 
    tech_score: float, 
    comm_score: float, 
    feedback: str, 
    strengths: list, 
    weaknesses: list, 
    interview_id: str
) -> bool:
    """
    Constructs a styled HTML email report and sends it to the user.
    """
    subject = f"Evaluation Report: {role} Mock Interview ({overall_score}/10)"
    
    strengths_html = "".join([f"<li style='margin-bottom: 8px; color: #d1d5db;'>✓ {s}</li>" for s in strengths]) if strengths else "<li style='color: #9ca3af;'>No highlights specified</li>"
    weaknesses_html = "".join([f"<li style='margin-bottom: 8px; color: #d1d5db;'>⚠ {w}</li>" for w in weaknesses]) if weaknesses else "<li style='color: #9ca3af;'>No details specified</li>"

    html_body = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body {{
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                background-color: #0a0a0a;
                color: #ffffff;
                margin: 0;
                padding: 0;
            }}
            .container {{
                max-width: 600px;
                margin: 40px auto;
                background-color: #121212;
                border: 1px solid #1f1f1f;
                border-radius: 16px;
                overflow: hidden;
                box-shadow: 0 10px 30px rgba(0,0,0,0.5);
            }}
            .header {{
                background: linear-gradient(135deg, #2563eb 0%, #7c3aed 100%);
                padding: 40px 30px;
                text-align: center;
            }}
            .header h1 {{
                margin: 0;
                font-size: 26px;
                font-weight: 800;
                color: #ffffff;
                letter-spacing: -0.5px;
            }}
            .header p {{
                margin: 8px 0 0 0;
                font-size: 14px;
                color: #e0e7ff;
                font-weight: 500;
                text-transform: uppercase;
                letter-spacing: 1px;
            }}
            .content {{
                padding: 30px;
            }}
            .scores-grid {{
                display: table;
                width: 100%;
                margin-bottom: 30px;
                background-color: #1a1a1a;
                border: 1px solid #262626;
                border-radius: 12px;
                padding: 15px 0;
            }}
            .score-col {{
                display: table-cell;
                width: 33.33%;
                text-align: center;
                vertical-align: middle;
            }}
            .score-val {{
                font-size: 28px;
                font-weight: 900;
                margin: 0;
            }}
            .score-overall {{ color: #3b82f6; }}
            .score-tech {{ color: #10b981; }}
            .score-comm {{ color: #d946ef; }}
            .score-label {{
                font-size: 10px;
                font-weight: 700;
                color: #737373;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                margin-top: 4px;
            }}
            .section {{
                margin-bottom: 25px;
            }}
            .section h3 {{
                font-size: 14px;
                font-weight: 700;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                margin-top: 0;
                margin-bottom: 12px;
                border-bottom: 1px solid #1f1f1f;
                padding-bottom: 6px;
            }}
            .feedback-text {{
                font-size: 14px;
                line-height: 1.6;
                color: #a3a3a3;
                margin: 0;
            }}
            .list-strengths {{
                list-style-type: none;
                padding-left: 0;
                margin: 0;
                font-size: 13px;
            }}
            .list-weaknesses {{
                list-style-type: none;
                padding-left: 0;
                margin: 0;
                font-size: 13px;
            }}
            .button-container {{
                text-align: center;
                margin-top: 35px;
                margin-bottom: 10px;
            }}
            .btn {{
                background-color: #2563eb;
                color: #ffffff !important;
                padding: 12px 30px;
                font-size: 14px;
                font-weight: 700;
                text-decoration: none;
                border-radius: 8px;
                display: inline-block;
                transition: background-color 0.2s;
            }}
            .footer {{
                background-color: #0d0d0d;
                padding: 20px;
                text-align: center;
                border-top: 1px solid #1f1f1f;
                font-size: 11px;
                color: #525252;
            }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <p>{difficulty} Difficulty Room</p>
                <h1>{role} Report</h1>
            </div>
            
            <div class="content">
                <div class="scores-grid">
                    <div class="score-col">
                        <p class="score-val score-overall">{overall_score}</p>
                        <p class="score-label">Overall</p>
                    </div>
                    <div class="score-col" style="border-left: 1px solid #262626; border-right: 1px solid #262626;">
                        <p class="score-val score-tech">{tech_score}</p>
                        <p class="score-label">Technical</p>
                    </div>
                    <div class="score-col">
                        <p class="score-val score-comm">{comm_score}</p>
                        <p class="score-label">Communication</p>
                    </div>
                </div>

                <div class="section">
                    <h3 style="color: #3b82f6;">Performance Overview</h3>
                    <p class="feedback-text">{feedback}</p>
                </div>

                <div class="section" style="margin-top: 30px;">
                    <div style="background-color: #064e3b; border: 1px solid #065f46; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
                        <h4 style="margin-top: 0; margin-bottom: 8px; color: #34d399; font-size: 13px; text-transform: uppercase;">Key Strengths</h4>
                        <ul class="list-strengths">{strengths_html}</ul>
                    </div>
                    
                    <div style="background-color: #78350f; border: 1px solid #92400e; padding: 15px; border-radius: 8px;">
                        <h4 style="margin-top: 0; margin-bottom: 8px; color: #fbbf24; font-size: 13px; text-transform: uppercase;">Areas for Improvement</h4>
                        <ul class="list-weaknesses">{weaknesses_html}</ul>
                    </div>
                </div>

                <div class="button-container">
                    <a href="http://localhost:3000/interview/{interview_id}/result" class="btn">View Full Assessment</a>
                </div>
            </div>

            <div class="footer">
                <p>This report was generated dynamically by the AI Mock Interview Recruiter Agent.</p>
                <p>&copy; 2026 AI Mock Interview Platform. All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>
    """

    return send_email_report(to_email, subject, html_body)
