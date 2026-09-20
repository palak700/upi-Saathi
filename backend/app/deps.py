"""FastAPI dependencies for authentication.

Endpoints that accept a token use ``get_current_user`` (403 when missing or
invalid). Compatibility endpoints used by the existing client accept either a
Bearer token OR fall back to the demo user, so the current React app keeps
working without a login while still honouring protected access when a token
is supplied.
"""

from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from .db import get_db
from .models import User
from .security import decode_access_token

bearer_scheme = HTTPBearer(auto_error=False)


def _demo_user(db: Session) -> User:
    user = db.query(User).filter(User.email == "aarav@demo.upisaathi.in").first()
    if user is None:
        user = User(
            name="Aarav",
            email="aarav@demo.upisaathi.in",
            password_hash="!",  # demo user cannot log in
            preferred_language="en",
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    return user


def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"},
        )
    subject = decode_access_token(credentials.credentials)
    if subject is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    user = db.get(User, int(subject)) if subject.isdigit() else None
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unknown user")
    return user


def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    """Return the authenticated user, or the demo user for guest access."""
    if credentials is not None:
        subject = decode_access_token(credentials.credentials)
        if subject is not None and subject.isdigit():
            user = db.get(User, int(subject))
            if user is not None:
                return user
    return _demo_user(db)


def require_role(*roles: str):
    allowed = set(roles)

    def dependency(user: User = Depends(get_current_user)) -> User:
        if allowed and user.role not in allowed:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient role")
        return user

    return dependency
