# start-backend.ps1
# Run this from the project root to start the FastAPI backend correctly.

Write-Host "Starting AI Mock Interview FastAPI backend..." -ForegroundColor Cyan
Set-Location "$PSScriptRoot\fastapi"
.\venv\Scripts\uvicorn.exe main:app --reload --host 127.0.0.1 --port 8000
