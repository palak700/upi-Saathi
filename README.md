# UPI Saathi – Inclusive AI Payment Assistant

UPI Saathi is an AI-powered accessibility assistant designed to make UPI payments simpler, safer, and easier to understand for everyone. It helps senior citizens, first-time smartphone users, people with visual or hearing impairments, users with low digital literacy, and multilingual communities navigate digital payments with confidence.

UPI Saathi focuses on accessibility and payment guidance rather than processing real financial transactions. It provides voice guidance, QR payment assistance, multilingual support, fraud awareness, and offline learning through a safe simulated payment environment.

---

## Problem Statement

Digital payments have become a part of everyday life in India, but many users still face challenges while using UPI applications due to language barriers, accessibility issues, unfamiliar interfaces, and increasing digital payment scams.

UPI Saathi aims to bridge this gap by providing an inclusive payment guidance experience that explains every step in a simple and accessible way.

---

## Features

### Voice-Based Payment Guidance

* Natural language voice input for payment instructions.
* Voice-to-text transcription.
* AI-based payment intent detection.
* Step-by-step confirmation before simulated payment.

### QR Payment Guidance

* Scan UPI QR codes using the device camera.
* Detect merchant details and payment amount.
* Display payment safety checks before confirmation.
* Practice QR payment flow without real transactions.

### Accessibility Features

* Large text mode.
* High contrast mode.
* Screen reader support.
* Simplified literacy mode.
* Visual guidance for users with hearing impairments.

### Multilingual Support

* Multiple Indian language support.
* Localized payment guidance.
* Text translation.
* Voice guidance in supported languages.

### Fraud Awareness

* Payment safety checklist.
* Scam awareness tutorials.
* Interactive fraud detection quiz.
* Safe payment practice scenarios.

### Offline Learning

* Learn UPI concepts without internet.
* Interactive tutorials.
* Beginner-friendly payment lessons.

### Dashboard

* Personalized dashboard.
* Payment history.
* Notifications.
* Learning progress and analytics.

### AI Saathi Assistant

* AI-powered payment assistant.
* Answers payment-related questions.
* Provides safe payment guidance.

---

## Tech Stack

| Category         | Technology                            |
| ---------------- | ------------------------------------- |
| Frontend         | React, TypeScript, Vite, Tailwind CSS |
| Backend          | FastAPI, Python                       |
| State Management | TanStack Query                        |
| Routing          | Wouter                                |
| QR Scanner       | ZXing Browser Library                 |
| Voice Support    | Web Speech API                        |
| Package Manager  | PNPM Workspace                        |

---

## Project Structure

```text
UPI-Saathi/
│
├── artifacts/
│   ├── upi-saathi/          # React Frontend
│   └── api-server/          # API Server
│
├── backend/                 # FastAPI Backend
│
├── pnpm-workspace.yaml
├── package.json
└── README.md
```

---

## Installation

### Clone Repository

```bash
git clone https://github.com/palak700/upi-Saathi.git

cd upi-Saathi
```

### Install Dependencies

```bash
pnpm install
```

---

## Run Backend

Open the first terminal.

```bash
cd backend

python -m venv .venv

# Windows
.venv\Scripts\activate

pip install -r requirements.txt

uvicorn app.main:app --reload --port 5000
```

Backend runs on:

```text
http://localhost:5000
```

---

## Run Frontend

Open a second terminal.

```bash
cd artifacts/upi-saathi

pnpm run dev
```

Frontend runs on:

```text
http://localhost:5173
```

---

## Demo Workflow

1. Open the dashboard.
2. Try a voice-based payment instruction.
3. Scan a sample UPI QR code.
4. Review payment safety checks.
5. Confirm a simulated payment.
6. Explore fraud awareness and offline learning modules.

All payment interactions are simulated for learning and accessibility purposes.

---

## NPCI Relevance

UPI Saathi is inspired by the UPI ecosystem and focuses on improving accessibility, digital literacy, and payment safety through AI-powered guidance. It demonstrates concepts related to voice-assisted payments, QR payment understanding, multilingual accessibility, and secure payment education.

This project is a learning and accessibility assistant and does not process real UPI transactions.

---

## Future Enhancements

* OCR-based QR understanding.
* Regional language voice assistance.
* Sign language payment guidance.
* AI-powered scam message detection.
* Offline-first accessibility support.
* Personalized digital literacy tracking.



## License

This project is developed for educational and hackathon purposes.
