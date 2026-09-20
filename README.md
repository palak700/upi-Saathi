# 🚀 How to Run UPI Saathi

## Prerequisites

Make sure the following are installed on your system:

- Node.js (v20 or later recommended)
- PNPM (v9 or later)
- Git

Verify installation:

```bash
node -v
pnpm -v
git --version
```

---

## 1. Clone the Repository

```bash
git clone https://github.com/palak700/upi-Saathi.git
cd upi-Saathi
```

---

## 2. Install Dependencies

Install all workspace packages using PNPM:

```bash
pnpm install
```

This installs dependencies for the frontend, backend, and shared libraries.

---

## 3. Start the Development Server

Run the complete application:

```bash
pnpm dev
```

This starts:

- Frontend (React + Vite)
- API Server
- Shared workspace packages

If Vite starts successfully, open:

```text
http://localhost:5173
```

---

## 4. Run Individual Services (Optional)

### Frontend Only

```bash
pnpm --filter upi-saathi dev
```

### API Server Only

```bash
pnpm --filter api-server dev
```

---

## Project Structure

```text
upi-Saathi/
│── artifacts/
│   ├── upi-saathi/          # React + Vite frontend
│   ├── api-server/          # Backend API server
│   └── mockup-sandbox/      # Sandbox environment
│
│── lib/
│   ├── api-client-react/    # Generated React API client
│   ├── api-zod/             # Zod schemas and API types
│   ├── api-spec/            # OpenAPI specification
│   └── db/                  # Database schema and utilities
│
├── package.json
├── pnpm-workspace.yaml
└── README.md
```

---

## Available Scripts

| Command | Description |
|---------|-------------|
| `pnpm install` | Install all dependencies. |
| `pnpm dev` | Start the full development environment. |
| `pnpm build` | Build all workspace packages for production. |
| `pnpm lint` | Run lint checks. |
| `pnpm typecheck` | Run TypeScript type checking. |

---

## Troubleshooting

### Port 5173 is already in use

If the frontend port is occupied:

```bash
pnpm --filter upi-saathi dev -- --host 0.0.0.0 --port 5174
```

Then open:

```text
http://localhost:5174
```

### Reinstall Dependencies

If dependencies are missing or corrupted:

```bash
pnpm install --force
```

---

## Tech Stack

- **Frontend:** React, Vite, TypeScript, Tailwind CSS
- **Backend:** Node.js API Server
- **API Specification:** OpenAPI + Zod
- **Package Manager:** PNPM Workspace
