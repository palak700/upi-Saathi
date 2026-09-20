# UPI Saathi backend

Production FastAPI backend for the UPI Saathi app. It keeps the exact `/api/*`
surface of the original Express server so the React frontend keeps working
unchanged, and adds authentication, RAG safety explanations, a QR Safety
Guardian, voice assistant endpoints and multilingual payment confirmations.

## Stack

- **FastAPI** + Swagger UI (`/docs`) and ReDoc (`/redoc`)
- **SQLAlchemy 2** + **Alembic** over **PostgreSQL** (SQLite URL also supported for local dev)
- **JWT** auth (signup / login / protected `/auth/me`; anonymous requests act as a demo user)
- **ChromaDB + LangChain** RAG over NPCI UPI safety guidelines
- **OpenCV + pyzbar + EasyOCR** QR decoding
- **faster-whisper** server-side speech-to-text (optional)
- **gTTS** server-side text-to-speech (optional)
- **Twilio** SMS/WhatsApp confirmation delivery (optional)

## Setup

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate            # Windows
pip install -r requirements.txt
```

Bring up PostgreSQL (optional — you can use SQLite for a quick run):

```bash
docker compose up -d
```

Set the database. Defaults to `postgresql+psycopg://postgres:postgres@localhost:5432/upi_saathi`:

```bash
set UPI_DATABASE_URL=sqlite:///./upi_saathi.db   # quick local/SQLite run
# or PostgreSQL:
set UPI_DATABASE_URL=postgresql+psycopg://postgres:postgres@localhost:5432/upi_saathi
```

Create the schema (faster: the app also auto-creates tables on boot):

```bash
alembic upgrade head
```

Run:

```bash
uvicorn app.main:app --host 0.0.0.0 --port 5000
```

The Vite dev proxy already forwards `/api` to `http://localhost:5000`, so the
React app connects with no changes.

## Optional heavy extras

The API degrades gracefully when these are absent: the chat assistant falls
back to rule-based safety answers, QR decode still works for payloads, TTS
returns text for browser speech synthesis, and confirmations run in preview
mode. Install them for the full experience:

```bash
pip install sentence-transformers easyocr faster-whisper gTTS twilio
```

Set `UPI_WHISPER_MODEL_SIZE` (default `tiny`) and, for deliveries, the
`UPI_TWILIO_ACCOUNT_SID`, `UPI_TWILIO_AUTH_TOKEN`, `UPI_TWILIO_FROM_NUMBER`
variables.

## Key configuration

| Variable | Default | Purpose |
| --- | --- | --- |
| `UPI_DATABASE_URL` | `postgresql+psycopg://postgres:postgres@localhost:5432/upi_saathi` | Database connection |
| `UPI_SECRET_KEY` | dev secret | JWT signing key (change in production) |
| `UPI_HIGH_AMOUNT_THRESHOLD` | `10000` | Fraud engine high-amount rule |
| `UPI_CHROMA_DIR` | `./chroma_store` | ChromaDB persistence folder |
| `UPI_OCR_ENABLED` | `true` | EasyOCR fallback for QR images |

## Endpoints

- `POST /api/auth/signup`, `POST /api/auth/login`, `GET /api/auth/me`
- `POST /api/qr/safety/explain` — QR Safety Guardian with RAG explanation
- `POST /api/payment/confirmations` — multilingual SMS/WhatsApp/voice confirmations + trusted contact
- All legacy `/api/*` endpoints (dashboard, voice, intent, payments, QR, tutorials,
  literacy, fraud, assistant, notifications, analytics, settings, translate, speak)
- Swagger UI at `/docs`, ReDoc at `/redoc`

See `lib/api-spec/openapi.yaml` for the machine-readable contract.