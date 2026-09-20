import os
os.environ["UPI_DATABASE_URL"] = "sqlite:///./smoke_test.db"
from fastapi.testclient import TestClient
from app.main import app
out = []
with TestClient(app) as client:
    for lang in ["hi", "ta", "en"]:
        t = client.post("/api/translate", json={"text": "I will show you before you pay.", "language": lang}).json()
        s = client.post("/api/voice/speak", json={"text": "I will show you before you pay.", "language": lang}).json()
        out.append(f"{lang} translate={t['translatedText']!r} speak={s['text']!r} match={t['translatedText'] == s['text']}")
    u = client.post("/api/voice/speak", json={"text": "Custom phrase here", "language": "hi"}).json()
    out.append(f"unknown echo={u['text']!r}")
with open("_out.txt", "w", encoding="utf-8") as f:
    f.write("\n".join(out))
