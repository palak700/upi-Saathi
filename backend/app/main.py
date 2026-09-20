"""FastAPI application entrypoint for the UPI Saathi backend.

Run with:  uvicorn app.main:app --host 0.0.0.0 --port 5000
Swagger docs: http://localhost:5000/docs
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError

from .config import get_settings
from .db import SessionLocal, engine, init_models
from .routers import assistant, auth, core, payments, qr
from .seeding import seed_database

settings = get_settings()

DESCRIPTION = """UPI Saathi — a beginner-friendly, accessible UPI safety companion.

* **Voice + intent** assistant with multilingual speech (English, Hindi, Marathi,
  Tamil, Telugu, Gujarati, Bengali, Kannada, Malayalam, Punjabi, Rajasthani).
* **QR Safety Guardian** that decodes QR codes (OpenCV + pyzbar + EasyOCR) and
  explains risks from the NPCI UPI safety guidelines via a ChromaDB + LangChain
  retrieval-augmented knowledge base.
* **Fraud detection** for fake QR codes, collect requests, suspicious UPI IDs,
  high amounts and merchant mismatches.
* **JWT authentication** with protected routes.
* **Payment confirmations** delivered by SMS / WhatsApp / voice, plus an
  optional trusted contact, in the user's language.
* **Offline learning centre** with progress tracking, quizzes and bookmarks.
"""


@asynccontextmanager
async def lifespan(_app: FastAPI):
    init_models()
    db = SessionLocal()
    try:
        seed_database(db)
    finally:
        db.close()
    yield


app = FastAPI(
    title="UPI Saathi API",
    version="1.0.0",
    description=DESCRIPTION,
    contact={"name": "UPI Saathi"},
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in settings.cors_origins.split(",")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(_request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=422,
        content={
            "detail": [
                {"loc": list(err["loc"]), "msg": err["msg"], "type": err["type"]}
                for err in exc.errors()
            ]
        },
    )


@app.get("/", include_in_schema=False)
def root():
    return {
        "app": settings.app_name,
        "docs": "/docs",
        "health": "/api/healthz",
    }


app.include_router(core.router, prefix=settings.api_prefix)
app.include_router(auth.router, prefix=settings.api_prefix)
app.include_router(payments.router, prefix=settings.api_prefix)
app.include_router(qr.router, prefix=settings.api_prefix)
app.include_router(assistant.router, prefix=settings.api_prefix)