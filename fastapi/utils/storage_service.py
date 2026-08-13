"""
Storage Service — Module 13
Supports S3, Cloudinary, and local filesystem fallback for file uploads.
Auto-detects available provider based on environment variables.
"""

import os
import uuid
import logging
from pathlib import Path

logger = logging.getLogger("storage_service")

# ── Configuration ───────────────────────────────────────────────────────────────

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "uploads")
MAX_FILE_SIZE_MB = 5
ALLOWED_EXTENSIONS = {".pdf", ".docx", ".doc", ".png", ".jpg", ".jpeg", ".webp", ".txt", ".csv"}


def _get_active_provider() -> str:
    """Detect which storage provider to use based on env vars."""
    if os.getenv("AWS_ACCESS_KEY_ID") and os.getenv("AWS_SECRET_ACCESS_KEY") and os.getenv("AWS_S3_BUCKET"):
        return "s3"
    if os.getenv("CLOUDINARY_CLOUD_NAME") and os.getenv("CLOUDINARY_API_KEY") and os.getenv("CLOUDINARY_API_SECRET"):
        return "cloudinary"
    return "local"


def upload_file_to_storage(file_bytes: bytes, filename: str, mime_type: str = "") -> dict:
    """
    Upload file bytes to the active storage provider.
    Returns dict with url, provider, filename, and size.
    """
    provider = _get_active_provider()
    ext = os.path.splitext(filename)[1].lower()
    unique_name = f"{uuid.uuid4().hex}_{filename}"

    if ext not in ALLOWED_EXTENSIONS:
        raise ValueError(f"File type '{ext}' is not allowed. Permitted: {', '.join(ALLOWED_EXTENSIONS)}")

    size_mb = len(file_bytes) / (1024 * 1024)
    if size_mb > MAX_FILE_SIZE_MB:
        raise ValueError(f"File size {size_mb:.1f}MB exceeds the {MAX_FILE_SIZE_MB}MB limit.")

    if provider == "s3":
        return _upload_to_s3(file_bytes, unique_name, mime_type)
    elif provider == "cloudinary":
        return _upload_to_cloudinary(file_bytes, unique_name)
    else:
        return _upload_to_local(file_bytes, unique_name)


def _upload_to_s3(file_bytes: bytes, filename: str, mime_type: str) -> dict:
    """Upload to AWS S3."""
    try:
        import boto3
        s3 = boto3.client(
            "s3",
            aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
            aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY"),
            region_name=os.getenv("AWS_REGION", "us-east-1"),
        )
        bucket = os.getenv("AWS_S3_BUCKET")
        key = f"uploads/{filename}"

        s3.put_object(
            Bucket=bucket,
            Key=key,
            Body=file_bytes,
            ContentType=mime_type or "application/octet-stream",
        )

        url = f"https://{bucket}.s3.amazonaws.com/{key}"
        logger.info(f"Uploaded to S3: {url}")

        return {
            "url": url,
            "provider": "s3",
            "filename": filename,
            "size_bytes": len(file_bytes),
        }
    except Exception as e:
        logger.error(f"S3 upload failed, falling back to local: {e}")
        return _upload_to_local(file_bytes, filename)


def _upload_to_cloudinary(file_bytes: bytes, filename: str) -> dict:
    """Upload to Cloudinary."""
    try:
        import cloudinary
        import cloudinary.uploader

        cloudinary.config(
            cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
            api_key=os.getenv("CLOUDINARY_API_KEY"),
            api_secret=os.getenv("CLOUDINARY_API_SECRET"),
        )

        result = cloudinary.uploader.upload(
            file_bytes,
            public_id=os.path.splitext(filename)[0],
            resource_type="auto",
        )

        url = result.get("secure_url", result.get("url", ""))
        logger.info(f"Uploaded to Cloudinary: {url}")

        return {
            "url": url,
            "provider": "cloudinary",
            "filename": filename,
            "size_bytes": len(file_bytes),
        }
    except Exception as e:
        logger.error(f"Cloudinary upload failed, falling back to local: {e}")
        return _upload_to_local(file_bytes, filename)


def _upload_to_local(file_bytes: bytes, filename: str) -> dict:
    """Save to local uploads directory (development fallback)."""
    Path(UPLOAD_DIR).mkdir(parents=True, exist_ok=True)

    filepath = os.path.join(UPLOAD_DIR, filename)
    with open(filepath, "wb") as f:
        f.write(file_bytes)

    # Serve via the FastAPI static mount at /uploads/
    url = f"http://localhost:8000/uploads/{filename}"
    logger.info(f"Saved locally: {filepath}")

    return {
        "url": url,
        "provider": "local",
        "filename": filename,
        "size_bytes": len(file_bytes),
    }


def delete_file_from_storage(filename: str, provider: str = "local") -> bool:
    """Delete a file from storage. Currently supports local only."""
    if provider == "local":
        filepath = os.path.join(UPLOAD_DIR, filename)
        if os.path.exists(filepath):
            os.unlink(filepath)
            return True
    return False
