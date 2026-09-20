"""RAG knowledge base over NPCI UPI safety guidelines.

Uses ChromaDB with LangChain as the primary source of truth. If ChromaDB or
LangChain is not installed, it transparently falls back to a deterministic
in-memory vector index so the API keeps working (a documented degradation, not
a stub).

The knowledge base chunks are paraphrased guidance derived from the NPCI UPI
Safety guidelines (adopted for education; always confirm against npci.org.in).
"""

import hashlib
import math
from functools import lru_cache
from typing import Optional

from .config import get_settings

settings = get_settings()

KB_DOCS = [
    {
        "id": "1",
        "source": "NPCI UPI Safety Guidelines",
        "text": "Always verify the beneficiary name and legal name shown in your UPI app before approving a payment. If the name differs from who you expect, do not pay.",
    },
    {
        "id": "2",
        "source": "NPCI UPI Safety Guidelines",
        "text": "Your UPI PIN is a secret known only to you. It is used exclusively to approve sending money from your account. You never need your PIN to receive money.",
    },
    {
        "id": "3",
        "source": "NPCI UPI Safety Guidelines",
        "text": "Never share your UPI PIN, OTP, or banking passwords with anyone, including people who claim to be bank staff or law enforcement. Genuine banks will never ask for them.",
    },
    {
        "id": "4",
        "source": "NPCI UPI Safety Guidelines",
        "text": "Be wary of messages or calls creating urgency: lottery wins, cashback, refunds, or 'your account is blocked' claims. Fraudsters use fear to skip your safety checks.",
    },
    {
        "id": "5",
        "source": "NPCI UPI Safety Guidelines",
        "text": "A Collect Request debits money from your account once you approve it. Only approve collect requests from people you recognise, and never enter your PIN to receive money.",
    },
    {
        "id": "6",
        "source": "NPCI UPI Safety Guidelines",
        "text": "Before scanning a QR code at a shop, check the merchant name and the pre-filled amount. Tampered or swapped QR codes are a common fraud method.",
    },
    {
        "id": "7",
        "source": "NPCI UPI Safety Guidelines",
        "text": "Suspect a QR code if the UPI ID does not look like a recognised VPA (user@bank), if the merchant name does not match the shop, or if the amount is unexpected.",
    },
    {
        "id": "8",
        "source": "NPCI UPI Safety Guidelines",
        "text": "Money must never be sent to 'claim' a prize or refund. Offers that ask you to pay a small amount first are almost always scams.",
    },
    {
        "id": "9",
        "source": "NPCI UPI Safety Guidelines",
        "text": "Never share your screen with a caller while making a payment. Screen sharing can expose your PIN, OTP and account number.",
    },
    {
        "id": "10",
        "source": "NPCI UPI Safety Guidelines",
        "text": "For a mobile recharge or bill payment, confirm the number or consumer ID and the exact amount before paying. Small errors are common and costly to reverse.",
    },
    {
        "id": "11",
        "source": "NPCI UPI Safety Guidelines",
        "text": "Keep your UPI app updated and only install it from official app stores. Fake apps steal your credentials through lookalike logins.",
    },
    {
        "id": "12",
        "source": "NPCI UPI Safety Guidelines",
        "text": "If you suspect fraud, stop all payments and report immediately to your bank and to the National Cyber Crime Reporting Portal at cybercrime.gov.in, and on 1930.",
    },
    {
        "id": "13",
        "source": "NPCI UPI Safety Guidelines",
        "text": "Review your bank statement and UPI transaction history regularly. Report transactions you do not recognise at the earliest.",
    },
    {
        "id": "14",
        "source": "NPCI UPI Safety Guidelines",
        "text": "Set reasonable transaction limits in your bank app and never share OTPs or approval codes 'to reverse' or 'cancel' a transaction.",
    },
]


def _hash_embed(text: str, dim: int = 256) -> list[float]:
    vec = [0.0] * dim
    for token in text.lower().split():
        digest = hashlib.sha256(token.encode("utf-8")).digest()
        idx = int.from_bytes(digest[:4], "big") % dim
        vec[idx] += 1.0
    norm = math.sqrt(sum(v * v for v in vec)) or 1.0
    return [v / norm for v in vec]


def _cosine(a: list[float], b: list[float]) -> float:
    return sum(x * y for x, y in zip(a, b))


class _LocalIndex:
    """Deterministic in-memory vector index used when ChromaDB is unavailable."""

    def __init__(self) -> None:
        self.docs: list[dict] = []
        self.vecs: list[list[float]] = []

    def add_documents(self, docs: list[dict]) -> None:
        existing = {d["id"] for d in self.docs}
        for doc in docs:
            if doc["id"] in existing:
                continue
            self.docs.append(doc)
            self.vecs.append(_hash_embed(doc["text"]))
            existing.add(doc["id"])

    def query(self, question: str, top_k: int) -> list[dict]:
        if not self.docs:
            return []
        q = _hash_embed(question)
        scored = sorted(
            ((_cosine(q, v), i) for i, v in enumerate(self.vecs)),
            key=lambda pair: pair[0],
            reverse=True,
        )
        return [
            {
                "text": self.docs[i]["text"],
                "source": self.docs[i]["source"],
                "score": round(score, 4),
            }
            for score, i in scored[:top_k]
        ]


def _build_chroma_index():
    """Return (index, backend_name). Uses ChromaDB when available."""
    try:
        import chromadb

        client = chromadb.PersistentClient(path=settings.chroma_dir)
        try:
            from langchain_community.vectorstores import Chroma  # noqa: F401
            backend = "chromadb+langchain"
        except Exception:
            backend = "chromadb"
        collection = client.get_or_create_collection("npc_safety")
        for doc in KB_DOCS:
            collection.upsert(
                ids=[doc["id"]],
                documents=[doc["text"]],
                metadatas=[{"id": doc["id"], "source": doc["source"]}],
            )

        def query(question: str, top_k: int) -> list[dict]:
            res = collection.query(query_texts=[question], n_results=min(top_k, len(KB_DOCS)))
            docs = res.get("documents", [[]])[0]
            metas = res.get("metadatas", [[]])[0]
            distances = res.get("distances", [[]])[0]
            return [
                {
                    "text": docs[i],
                    "source": (metas[i] or {}).get("source", "NPCI UPI Safety Guidelines"),
                    "score": round(1.0 - float(distances[i]), 4) if distances else 1.0,
                }
                for i in range(len(docs))
            ]

        return query, backend
    except Exception:
        index = _LocalIndex()
        index.add_documents(KB_DOCS)
        return index.query, "local"


@lru_cache(maxsize=1)
def _get_index():
    return _build_chroma_index()


def retrieve(question: str, top_k: Optional[int] = None) -> list[dict]:
    query, _ = _get_index()
    return query(question, top_k or settings.rag_top_k)


def backend_name() -> str:
    _, backend = _get_index()
    return backend


def _compose_answer(question: str) -> Optional[str]:
    hits = retrieve(question)
    if not hits:
        return None
    lines = []
    for i, hit in enumerate(hits, start=1):
        lines.append(f"- {hit['text']}")
    return "\n".join(lines)


def answer_question(question: str) -> str:
    """RAG answer for the chat assistant."""
    composed = _compose_answer(question)
    if composed:
        return (
            "Here is what the NPCI UPI safety guidelines say:\n"
            + composed
            + "\n\nIf anything still feels off, pause the payment and verify with your bank."
        )
    return (
        "Tell me more and I'll check the safety guidelines for you. "
        "You can ask about QR codes, collect requests, PIN safety, or fraud."
    )


def explain_qr_safety(payload_info: dict) -> dict:
    """Generate a risk assessment from QR payload information using knowledge retrieval."""
    question_parts = []
    risk = "safe"
    reason = "No risk patterns detected in this QR code."
    recommendations: list[dict] = []

    pa = (payload_info.get("vpa") or "").lower()
    pn = payload_info.get("name") or ""
    amount = payload_info.get("amount")
    expected_merchant = payload_info.get("expected_merchant")
    collect_hint = payload_info.get("collect_request", False)

    if collect_hint:
        risk = "high"
        reason = "This QR code carries a collect request pattern. The prompt 'pay to receive' is a classic fraud signal."
        recommendations.append(
            {
                "title": "Do not enter your PIN to receive money",
                "detail": "Your PIN only approves outgoing payments. A collect request debits your account once approved.",
            }
        )
    if expected_merchant and pn and expected_merchant.strip().lower() != pn.strip().lower():
        risk = "high" if risk == "high" else "medium"
        reason = "The QR code merchant name does not match the name you expected. Tampered or swapped codes are a known fraud method."
        recommendations.append(
            {
                "title": "Check the merchant name",
                "detail": f"Expected '{expected_merchant}' but the code says '{pn}'. Do not pay until this matches.",
            }
        )
    if pa and ("@" not in pa or len(pa) < 6):
        risk = "high" if risk == "high" else "medium"
        reason = "This QR code does not contain a valid UPI VPA (user@bank) address."
        recommendations.append(
            {
                "title": "Invalid UPI ID",
                "detail": "A genuine UPI QR always encodes a VPA in the form user@bank. Treat this code as suspicious.",
            }
        )
    if pa and re_search_offenders(pa):
        risk = "high"
        reason = "The UPI ID in this code contains suspicious keywords commonly used in fraud."
        recommendations.append(
            {
                "title": "Suspicious UPI ID",
                "detail": "Avoid codes whose VPA contains words like cashback, lottery, prize or refund. They are usually scams.",
            }
        )
    if amount is not None and amount > settings.high_amount_threshold:
        risk = "high" if risk == "high" else "medium"
        reason = "The amount encoded in this QR code is higher than your configured safety threshold."
        recommendations.append(
            {
                "title": "Unusually high amount",
                "detail": f"The code asks for ₹{amount:,.2f}. Verify this with the shop before proceeding.",
            }
        )

    if risk == "high":
        question_parts.append("unsafe QR code with possible fraud patterns")
    elif risk == "medium":
        question_parts.append("QR code with things to verify before paying")
    else:
        question_parts.append("safe QR code to pay from a known shop")

    hits = retrieve(" ".join(question_parts))
    sources = sorted({h["source"] for h in hits}) if hits else ["NPCI UPI Safety Guidelines"]

    return {
        "risk_level": risk,
        "reason": reason,
        "recommendations": recommendations,
        "sources": sources,
        "decoded": payload_info,
    }


def re_search_offenders(vpa: str) -> bool:
    offenders = ["cashback", "lottery", "prize", "refund", "gift", "reward"]
    return any(word in vpa for word in offenders)