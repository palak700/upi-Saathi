"""Smoke test harness: boots the full app against SQLite and exercises the
contract that the React frontend relies on, plus the new auth/RAG endpoints."""

import os
import sys

os.environ["UPI_DATABASE_URL"] = "sqlite:///./smoke_test.db"
os.environ["UPI_CHROMA_DIR"] = "./smoke_chroma"

from fastapi.testclient import TestClient
from app.main import app

results = []

with TestClient(app) as client:

    def check(label, resp, expect_status=200):
        ok = resp.status_code == expect_status
        body = resp.text[:200].replace("\n", " ").encode("ascii", "replace").decode("ascii")
        print(f"[{'OK' if ok else 'FAIL'}] {label} -> {resp.status_code}: {body}")
        return ok

    results.append(check("healthz", client.get("/api/healthz")))

    signup = client.post("/api/auth/signup", json={"name": "Anita Sharma", "email": "anita@example.com", "password": "secret123"})
    results.append(check("signup", signup, expect_status=201))
    token = signup.json().get("token", "") if signup.status_code == 201 else ""
    auth_header = {"Authorization": f"Bearer {token}"}
    results.append(check("me with token", client.get("/api/auth/me", headers=auth_header)))
    results.append(check("me without token protects", client.get("/api/auth/me"), expect_status=401))

    results.append(check("dashboard", client.get("/api/dashboard")))
    results.append(check("history", client.get("/api/history")))
    results.append(check("tutorials", client.get("/api/tutorials")))
    results.append(check("languages", client.get("/api/languages")))
    results.append(check("settings", client.get("/api/settings")))
    results.append(check("save settings", client.post("/api/settings", json={"profileName": "Anita", "language": "hi", "voiceGuidance": True, "voiceSelection": "default", "speechSpeed": 1.0, "largeText": False, "highContrast": False, "simplifiedMode": False, "reducedMotion": False, "dailySafetyReminders": True, "learningReminders": True, "practiceReminders": True})))

    results.append(check("voice/transcribe recharge", client.post("/api/voice/transcribe", json={"transcript": "Recharge my phone"})))
    results.append(check("intent/detect", client.post("/api/intent/detect", json={"text": "Pay Mom 500"})))
    results.append(check("voice/speak", client.post("/api/voice/speak", json={"text": "hello", "language": "hi"})))
    results.append(check("translate", client.post("/api/translate", json={"text": "hello", "language": "ta"})))

    results.append(check("payment/guide", client.post("/api/payment/guide", json={"recipient": "Mom", "amount": 500})))
    confirm = client.post("/api/payment/confirm", json={"recipient": "Mom", "amount": 500})
    results.append(check("payment/confirm", confirm, expect_status=201))

    results.append(check("qr/read", client.post("/api/qr/read", json={"merchant": "Big Bazaar", "amount": 245})))
    results.append(check("qr/history", client.get("/api/qr/history")))
    explain = client.post("/api/qr/safety/explain", json={"payload": "upi://pay?pa=shop@upi&pn=Big%20Bazaar&am=245&cu=INR", "expectedMerchant": "Big Bazaar"})
    results.append(check("qr/safety/explain payload", explain))
    explain_coll = client.post("/api/qr/safety/explain", json={"payload": "upi://pay?pa=cashback+prize@upi&pn=Lottery&am=99999&cu=INR"})
    results.append(check("qr/safety/explain collect/high", explain_coll))

    assistant = client.post("/api/assistant/message", json={"message": "Is it safe to scan a QR from a shop?"})
    results.append(check("assistant/message", assistant))
    results.append(check("assistant/history", client.get("/api/assistant/history")))

    results.append(check("fraud/alerts", client.get("/api/fraud/alerts")))
    results.append(check("fraud/quiz", client.post("/api/fraud/quiz", json={"category": "phishing", "result": "8/10"}), expect_status=201))
    results.append(check("notifications", client.get("/api/notifications")))
    results.append(check("analytics", client.get("/api/analytics")))

    notif = client.get("/api/notifications").json()
    if isinstance(notif, list) and notif:
        results.append(check("mark notification read", client.patch(f"/api/notifications/{notif[0]['id']}/read")))
    results.append(check("tutorial progress", client.post("/api/tutorials/1/progress", json={"progress": 50, "completed": False, "quizScore": 4, "bookmarked": True})))
    results.append(check("read-all", client.patch("/api/notifications/read-all"), expect_status=204))

    conf = client.post("/api/payment/confirmations", json={"recipient": "Police Station", "receiver": "+919876543210", "amount": 250, "language": "hi", "channel": "all"})
    results.append(check("confirmations preview", conf))

failed = sum(1 for r in results if not r)
print(f"\nSmoke test {'PASSED' if failed == 0 else 'FAILED'} ({len(results) - failed}/{len(results)} checks)")
sys.exit(1 if failed else 0)