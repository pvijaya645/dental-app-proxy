"""
Auth routes:
  POST /api/auth/register  — create a new dental office account
  POST /api/auth/login     — returns JWT
  GET  /api/auth/me        — returns current business (requires token)
  POST /api/auth/logout    — client-side only (stateless JWT), returns 200
"""

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.security import create_access_token, decode_access_token, hash_password, verify_password
from app.db.client import get_supabase
from app.db.models import BusinessCreate, BusinessRow, LoginRequest, TokenResponse

router = APIRouter(tags=["auth"])
bearer_scheme = HTTPBearer()


# ── Dependency: get current authenticated business ────────────

def get_current_business(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> dict:
    """
    Decode JWT from Authorization: Bearer <token>.
    Raises 401 if token is missing, invalid, or expired.
    """
    business_id = decode_access_token(credentials.credentials)
    if not business_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    db = get_supabase()
    result = db.table("businesses").select("*").eq("id", business_id).single().execute()

    if not result.data:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Business not found")

    if not result.data.get("is_active"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is deactivated")

    return result.data


# ── POST /register ────────────────────────────────────────────

@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(payload: BusinessCreate):
    db = get_supabase()

    # Check for duplicate email
    existing = db.table("businesses").select("id").eq("email", payload.email).execute()
    if existing.data:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists",
        )

    new_business = {
        "name": payload.name,
        "email": payload.email,
        "password_hash": hash_password(payload.password),
        "phone": payload.phone,
        "address": payload.address,
        "timezone": payload.timezone,
        "plan": "starter",
        "business_hours": {},
        "services": [],
    }

    result = db.table("businesses").insert(new_business).execute()

    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create account",
        )

    business = result.data[0]
    token = create_access_token(business["id"])

    return TokenResponse(
        access_token=token,
        business=BusinessRow(**business),
    )


# ── POST /login ───────────────────────────────────────────────

@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest):
    db = get_supabase()

    result = db.table("businesses").select("*").eq("email", payload.email).execute()

    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    business = result.data[0]

    if not verify_password(payload.password, business["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    if not business.get("is_active"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is deactivated")

    token = create_access_token(business["id"])

    return TokenResponse(
        access_token=token,
        business=BusinessRow(**business),
    )


# ── GET /me ───────────────────────────────────────────────────

@router.get("/me", response_model=BusinessRow)
def me(current_business: dict = Depends(get_current_business)):
    return BusinessRow(**current_business)


# ── POST /logout ──────────────────────────────────────────────

@router.post("/logout", status_code=status.HTTP_200_OK)
def logout():
    """
    JWT is stateless — actual logout is handled client-side by deleting the token.
    This endpoint exists for completeness and future token blocklist support.
    """
    return {"message": "Logged out successfully"}
