"""Ask Saathi assistant: conversation history and RAG-backed answers."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import desc
from sqlalchemy.orm import Session

from ..db import get_db
from ..deps import get_optional_user
from ..models import ActivityLog, AssistantHistory, User
from ..rag import answer_question, backend_name
from ..services import rules_reply

router = APIRouter(prefix="/assistant", tags=["assistant"])


def _to_dict(row: AssistantHistory) -> dict:
    return {
        "id": row.id,
        "from": row.from_,
        "message": row.message,
        "createdAt": row.created_at.isoformat(),
    }


@router.get("/history")
def get_assistant_history(user: User = Depends(get_optional_user), db: Session = Depends(get_db)):
    rows = (
        db.query(AssistantHistory)
        .order_by(desc(AssistantHistory.created_at))
        .limit(50)
        .all()
    )
    return [_to_dict(row) for row in rows]


@router.post("/message")
def send_assistant_message(
    body: dict,
    user: User = Depends(get_optional_user),
    db: Session = Depends(get_db),
):
    message = (body.get("message") or "").strip()
    if not message:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="message is required")

    db.add(AssistantHistory(user_id=user.id, from_="you", message=message))

    if backend_name() in ("chromadb", "chromadb+langchain"):
        reply_text = answer_question(message)
    else:
        reply_text = rules_reply(message)

    reply = AssistantHistory(user_id=user.id, from_="saathi", message=reply_text)
    db.add(reply)
    db.add(ActivityLog(user_id=user.id, activity_type="assistant_use", value=1))
    db.commit()
    db.refresh(reply)

    return {
        "id": reply.id,
        "from": reply.from_,
        "message": reply.message,
        "createdAt": reply.created_at.isoformat(),
    }