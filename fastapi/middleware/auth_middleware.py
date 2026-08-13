from starlette.middleware.base import BaseHTTPMiddleware
from fastapi import HTTPException
from fastapi.responses import JSONResponse
from utils.security import verify_token

class AuthMiddleware(BaseHTTPMiddleware):

    async def dispatch(self, request, call_next):

        public_routes = [
            "/",
            "/docs",
            "/openapi.json",
            "/login",
            "/signup",
            "/favicon.ico"
        ]

        # ✅ allow public routes
        if request.url.path in public_routes or request.url.path.startswith("/docs") or request.url.path.startswith("/openapi"):
            return await call_next(request)

        # 🔐 token check for everything else
        token = request.headers.get("Authorization")

        if not token:
            return JSONResponse(status_code=401, content={"detail": "Token missing"})

        if not token.startswith("Bearer "):
            return JSONResponse(status_code=401, content={"detail": "Invalid token scheme"})

        token_str = token.split(" ")[1]
        payload = verify_token(token_str)
        if not payload or "email" not in payload:
            return JSONResponse(status_code=401, content={"detail": "Invalid or expired token"})

        # Attach authenticated user email to the request state
        request.state.user = payload["email"]

        return await call_next(request)