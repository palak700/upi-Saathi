"""Authentication endpoints: signup, login, refresh, logout and profile."""

from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..db import get_db
from ..deps import get_current_user
from ..models import (
    AccessibilityPreference,
    ActivityLog,
    NotificationPreference,
    RefreshSession,
    User,
    VoiceSetting,
)
from ..schemas import (
    AuthResponse,
    LoginBody,
    LogoutBody,
    ProfileUpdateBody,
    RefreshTokenBody,
    SignupBody,
    UserOut,
)
from ..security import (
    create_access_token,
    create_refresh_token,
    hash_password,
    refresh_token_expires_at,
    refresh_token_hash,
    verify_password,
)

router = APIRouter(prefix="/auth", tags=["auth"])


def _log(db: Session, user_id: int, activity_type: str, metadata: str = "{}") -> None:
    db.add(ActivityLog(user_id=user_id, activity_type=activity_type, metadata_json=metadata))


def _ensure_user_defaults(db: Session, user: User) -> None:
    if not db.query(AccessibilityPreference).filter(AccessibilityPreference.user_id == user.id).first():
        db.add(AccessibilityPreference(user_id=user.id, profile_name=user.name, language=user.preferred_language))
    if not db.query(NotificationPreference).filter(NotificationPreference.user_id == user.id).first():
        db.add(NotificationPreference(user_id=user.id))
    if not db.query(VoiceSetting).filter(VoiceSetting.user_id == user.id).first():
        db.add(VoiceSetting(user_id=user.id, language=user.preferred_language))


def _auth_response(db: Session, user: User, activity_type: str | None = None) -> AuthResponse:
    access = create_access_token(str(user.id))
    refresh = create_refresh_token()
    db.add(
        RefreshSession(
            user_id=user.id,
            token_hash=refresh_token_hash(refresh),
            expires_at=refresh_token_expires_at(),
        )
    )
    if activity_type:
        _log(db, user.id, activity_type)
    db.commit()
    return AuthResponse(
        accessToken=access,
        refreshToken=refresh,
        token=access,
        user=UserOut.model_validate(user),
    )


@router.post("/signup", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
def signup(body: SignupBody, db: Session = Depends(get_db)):
    email = body.email.lower()
    if db.query(User).filter(User.email == email).first():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="An account with this email already exists.")
    user = User(
        name=body.name.strip(),
        email=email,
        password_hash=hash_password(body.password),
        preferred_language="en",
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    _ensure_user_defaults(db, user)
    db.commit()
    return _auth_response(db, user, "signup")


@router.post("/login", response_model=AuthResponse)
def login(body: LoginBody, db: Session = Depends(get_db)):
    email = body.email.lower()
    user = db.query(User).filter(User.email == email).first()
    if user is None or user.password_hash == "!" or not verify_password(body.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password.",
        )
    _ensure_user_defaults(db, user)
    db.commit()
    return _auth_response(db, user, "login")


@router.post("/refresh", response_model=AuthResponse)
def refresh(body: RefreshTokenBody, db: Session = Depends(get_db)):
    token_hash = refresh_token_hash(body.refreshToken)
    session = db.query(RefreshSession).filter(RefreshSession.token_hash == token_hash).first()
    now = datetime.now(timezone.utc)
    if session is None or session.revoked or session.expires_at < now:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired refresh token")
    user = db.get(User, session.user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unknown user")
    session.revoked = True
    session.last_used_at = now
    return _auth_response(db, user, "refresh_token")


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(body: LogoutBody, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if body.refreshToken:
        token_hash = refresh_token_hash(body.refreshToken)
        session = db.query(RefreshSession).filter(RefreshSession.token_hash == token_hash, RefreshSession.user_id == user.id).first()
        if session:
            session.revoked = True
            session.last_used_at = datetime.now(timezone.utc)
    else:
        db.query(RefreshSession).filter(RefreshSession.user_id == user.id).update({RefreshSession.revoked: True})
    _log(db, user.id, "logout")
    db.commit()


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(get_current_user)):
    return UserOut.model_validate(user)


@router.get("/profile", response_model=UserOut)
def get_profile(user: User = Depends(get_current_user)):
    return UserOut.model_validate(user)


@router.patch("/profile", response_model=UserOut)
def update_profile(
    body: ProfileUpdateBody,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    updates = body.model_dump(exclude_unset=True)
    for key, value in updates.items():
        setattr(user, key, value)
    if body.preferred_language:
        pref = db.query(AccessibilityPreference).filter(AccessibilityPreference.user_id == user.id).first()
        if pref:
            pref.language = body.preferred_language
        voice = db.query(VoiceSetting).filter(VoiceSetting.user_id == user.id).first()
        if voice:
            voice.language = body.preferred_language
    _log(db, user.id, "profile_updated")
    db.commit()
    db.refresh(user)
    return UserOut.model_validate(user)
