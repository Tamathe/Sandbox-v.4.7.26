from fastapi import APIRouter, HTTPException, Depends, status

from app.schemas import UserRegister, UserLogin, UserResponse, TokenResponse
from app.services.auth_service import (
    register_user,
    authenticate_user,
    create_access_token,
    get_user_count,
)
from app.dependencies import get_current_user, require_admin

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register", response_model=TokenResponse)
async def register(data: UserRegister):
    """Register a new user. First user becomes admin automatically."""
    count = get_user_count()

    # First user is always admin
    role = data.role
    if count == 0:
        role = "admin"

    try:
        new_user = register_user(
            email=data.email,
            password=data.password,
            full_name=data.full_name,
            role=role,
            hospital_site=data.hospital_site,
        )
    except Exception as e:
        if "UNIQUE constraint" in str(e):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Email already registered",
            )
        raise

    token = create_access_token(new_user["id"], new_user["role"])
    return TokenResponse(
        access_token=token,
        user=UserResponse(
            id=new_user["id"],
            email=new_user["email"],
            full_name=new_user["full_name"],
            role=new_user["role"],
            hospital_site=new_user["hospital_site"],
            is_active=bool(new_user["is_active"]),
            created_at=new_user["created_at"],
        ),
    )


@router.post("/login", response_model=TokenResponse)
async def login(data: UserLogin):
    user = authenticate_user(data.email, data.password)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )
    token = create_access_token(user["id"], user["role"])
    return TokenResponse(
        access_token=token,
        user=UserResponse(
            id=user["id"],
            email=user["email"],
            full_name=user["full_name"],
            role=user["role"],
            hospital_site=user["hospital_site"],
            is_active=bool(user["is_active"]),
            created_at=user["created_at"],
        ),
    )


@router.get("/me", response_model=UserResponse)
async def get_me(user: dict = Depends(get_current_user)):
    return UserResponse(
        id=user["id"],
        email=user["email"],
        full_name=user["full_name"],
        role=user["role"],
        hospital_site=user["hospital_site"],
        is_active=bool(user["is_active"]),
        created_at=user["created_at"],
    )
