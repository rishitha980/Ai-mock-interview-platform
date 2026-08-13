"""
Storage Router — Module 13
File upload endpoint with size/type validation and multi-provider support.
"""

import logging
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from utils.security import verify_token
from utils.storage_service import upload_file_to_storage, ALLOWED_EXTENSIONS, MAX_FILE_SIZE_MB

logger = logging.getLogger("storage_router")

router = APIRouter(prefix="/storage", tags=["Storage"])
security = HTTPBearer()


def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    payload = verify_token(token)
    if not payload or "email" not in payload:
        raise HTTPException(status_code=401, detail="Invalid or expired authorization token")
    return payload["email"]


@router.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    user_email: str = Depends(get_current_user),
):
    """
    Upload a file to storage. Validates file size and extension.
    Automatically routes to S3/Cloudinary/Local based on environment configuration.
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")

    # Validate extension
    ext = "." + file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else ""
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"File type '{ext}' not allowed. Supported: {', '.join(sorted(ALLOWED_EXTENSIONS))}",
        )

    # Read file bytes
    file_bytes = await file.read()

    # Validate size
    size_mb = len(file_bytes) / (1024 * 1024)
    if size_mb > MAX_FILE_SIZE_MB:
        raise HTTPException(
            status_code=400,
            detail=f"File size {size_mb:.1f}MB exceeds the {MAX_FILE_SIZE_MB}MB limit.",
        )

    try:
        result = upload_file_to_storage(
            file_bytes=file_bytes,
            filename=file.filename,
            mime_type=file.content_type or "",
        )

        return {
            "message": "File uploaded successfully",
            "uploaded_by": user_email,
            **result,
        }
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        logger.error(f"Upload failed: {e}")
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")
