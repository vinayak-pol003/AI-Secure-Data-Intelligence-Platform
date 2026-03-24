# SENTINEL — AI Secure Data Intelligence Platform (SISA)

SENTINEL is a full-stack security scanning platform that detects sensitive data, credentials, PII, and security risks in text, logs, SQL queries, chat messages, and uploaded files — powered by real Claude AI insights.

Built for security teams and developers who need to audit content for accidental credential exposure, data leaks, and policy violations.

---

## What It Does

You paste or upload content. SENTINEL scans it, scores the risk, highlights every finding, and then Claude AI writes specific, actionable recommendations — not generic advice, but insight referencing the actual data found.

**Detects 13+ sensitive data types:**
- API keys and secret tokens
- Passwords and credentials
- Database connection strings
- Email addresses and phone numbers
- JWT tokens and OAuth secrets
- SQL injection patterns
- Brute force attack attempts
- Stack traces with internal system details
- IP addresses and PII

**Features:**
- Real-time risk scoring (0–10 scale, LOW / MEDIUM / HIGH / CRITICAL)
- Sensitive value masking (`password=S***t` instead of the real value)
- Scan history stored in PostgreSQL with full audit trail
- Redis caching (5-minute TTL) to avoid re-scanning identical content
- Rate limiting: 10 requests/min on text, 5 requests/min on file uploads
- API key authentication on all endpoints
- CORS restricted to configured origins

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + TypeScript + Vite |
| Backend | FastAPI (Python 3.12) |
| AI | Claude via OpenRouter API |
| Database | PostgreSQL 16 |
| Cache | Redis 7 |
| Containers | Docker + Docker Compose |
| DB Admin | Adminer (port 8080) |

---

## Project Structure

```
SISA Project/
├── docker-compose.yml          # Runs all services together
├── .gitignore
├── README.md
│
├── backend/
│   ├── main.py                 # FastAPI app — all API endpoints
│   ├── models.py               # SQLAlchemy DB models (ScanResult)
│   ├── database.py             # Async PostgreSQL connection
│   ├── cache.py                # Redis cache helpers
│   ├── requirements.txt        # Python dependencies
│   ├── Dockerfile
│   ├── .env                    # Your secrets (git-ignored, create manually)
│   ├── .env.example            # Template for .env
│   │
│   ├── ai/
│   │   └── claude_client.py    # OpenRouter API integration
│   │
│   ├── detectors/
│   │   ├── regex_detector.py   # Pattern matching for 13+ data types
│   │   └── log_analyzer.py     # Log-specific analysis (brute force, etc.)
│   │
│   ├── engines/
│   │   ├── risk_engine.py      # Risk score calculation
│   │   └── policy_engine.py    # Policy rule enforcement
│   │
│   └── parsers/
│       ├── text_parser.py      # Plain text parsing
│       ├── log_parser.py       # Log file parsing
│       ├── file_parser.py      # Routes file to correct parser
│       ├── pdf_parser.py       # PDF text extraction
│       └── doc_parser.py       # Word document parsing
│
└── frontend/
    ├── src/
    │   ├── App.tsx             # Main UI — tabs, input, results
    │   ├── api.ts              # Axios client with auth interceptor
    │   └── components/
    │       ├── FileUpload.tsx  # Drag-and-drop file upload
    │       ├── RiskPanel.tsx   # Risk score + findings table
    │       ├── InsightsPanel.tsx # Claude AI insights display
    │       ├── LogViewer.tsx   # Highlighted log viewer
    │       └── ScanHistory.tsx # Past scans browser
    ├── .env                    # Frontend secrets (git-ignored, create manually)
    ├── .env.example
    └── Dockerfile
```

---

## Prerequisites

Before you start, make sure you have these installed:

- **Docker Desktop** — [download here](https://www.docker.com/products/docker-desktop/)
- **Node.js 18+** — [download here](https://nodejs.org/) (only needed for local frontend dev)
- **Python 3.12+** — [download here](https://www.python.org/downloads/) (only needed for local backend dev)
- **An OpenRouter API key** — [get one free at openrouter.ai](https://openrouter.ai) (gives you access to Claude)

---

## Quick Start — Docker (Recommended)

This runs everything in containers. Easiest way to get started.

### Step 1 — Clone the repo

```bash
git clone https://github.com/YOUR_USERNAME/sisa-platform.git
cd "sisa-platform"
```

### Step 2 — Create the backend `.env` file

Create a file at `backend/.env` with this content:

```env
# Your OpenRouter API key (starts with sk-or-v1-)
ANTHROPIC_API_KEY=sk-or-v1-your-key-here

# A random secret string you choose — used to authenticate API requests
# Generate one: python -c "import secrets; print(secrets.token_hex(32))"
API_KEY=your-random-secret-here

# These are set automatically by Docker — leave as-is for local Docker runs
DATABASE_URL=postgresql+asyncpg://sisa:sisa_password@localhost:5432/sisa_db
REDIS_URL=redis://localhost:6379
```

### Step 3 — Create the frontend `.env` file

Create a file at `frontend/.env` with this content:

```env
VITE_API_URL=http://localhost:8000
VITE_API_KEY=your-random-secret-here
```

> The `API_KEY` in `backend/.env` and `VITE_API_KEY` in `frontend/.env` must be the **same value**.

### Step 4 — Add your keys to docker-compose.yml

Open `docker-compose.yml` and fill in the backend environment section:

```yaml
environment:
  API_KEY: "your-random-secret-here"
  ANTHROPIC_API_KEY: "sk-or-v1-your-key-here"
```

### Step 5 — Start everything

```bash
docker compose up --build
```

Wait about 30 seconds for all services to start. You'll see:
```
Application startup complete.
```

### Step 6 — Open the app

| Service | URL |
|---|---|
| Frontend UI | http://localhost |
| Backend API | http://localhost:8000 |
| API Docs (Swagger) | http://localhost:8000/docs |
| Database Admin | http://localhost:8080 |

---

## Local Development Setup (Without Docker)

Use this if you want hot-reload during development.

### Backend

```bash
cd backend

# Create virtual environment
python -m venv .venv

# Activate it
# Windows:
.venv\Scripts\activate
# Mac/Linux:
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create your .env file (see Step 2 above)

# Start the server
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

> You still need PostgreSQL and Redis running. The easiest way is to run just those via Docker:
> ```bash
> docker compose up -d postgres redis
> ```

### Frontend

```bash
cd frontend

# Install dependencies
npm install

# Create your .env file (see Step 3 above)

# Start the dev server
npm run dev
```

Frontend will be at `http://localhost:5173`

---

## How to Use the Platform

### Tabs explained

| Tab | What to paste |
|---|---|
| **TEXT** | Any text — code, config files, messages, documentation |
| **LOG** | Server logs, application logs, access logs |
| **SQL** | SQL queries, database output, schema definitions |
| **CHAT** | Chat messages, support tickets, email content |
| **FILE** | Upload `.txt`, `.log`, `.pdf`, `.docx` files |
| **HISTORY** | Browse all previous scans |

### Options

- **Mask sensitive values** — When enabled, found secrets are redacted in the output (e.g., `password=S***t`). The originals are never stored.

### Reading the results

1. **Risk Score** — 0–10 meter. Below 3 is LOW. Above 7 is CRITICAL.
2. **Findings table** — Every detected item with: type, line number, risk level, and masked value.
3. **AI Insights** — Claude's analysis of your specific findings with concrete next steps.

---

## API Endpoints

All endpoints (except `/health`) require the `X-API-Key` header.

```
X-API-Key: your-api-key-here
```

### `POST /analyze`
Scan plain text, SQL, chat, or log content.

```json
{
  "input_type": "text",
  "content": "password=Admin123 api_key=sk-abc123",
  "options": {
    "mask": true,
    "block_high_risk": false,
    "log_analysis": true
  }
}
```

**Response:**
```json
{
  "id": "uuid",
  "risk": { "score": 8.5, "level": "critical", "breakdown": {} },
  "findings": [
    { "type": "password", "risk": "critical", "line": 1, "value": "A*****3" }
  ],
  "summary": "Critical credentials exposed...",
  "insights": ["Rotate this password immediately...", "..."],
  "masked_content": "password=A*****3 api_key=sk-***23",
  "cached": false
}
```

### `POST /analyze/file`
Upload a file for scanning. Supports `.txt`, `.log`, `.pdf`, `.docx`. Max size: 10 MB.

```bash
curl -X POST http://localhost:8000/analyze/file \
  -H "X-API-Key: your-key" \
  -F "file=@server.log" \
  -F "input_type=log"
```

### `GET /scans`
List all past scans.

```
GET /scans?limit=50&offset=0
```

### `GET /scans/{id}`
Get full details of a specific past scan.

### `GET /health`
Check if all services are up.

```json
{
  "status": "ok",
  "checks": { "api": "ok", "database": "ok", "cache": "ok" }
}
```

---

## Environment Variables Reference

### Backend (`backend/.env`)

| Variable | Required | Description |
|---|---|---|
| `ANTHROPIC_API_KEY` | Yes | Your OpenRouter key (starts with `sk-or-v1-`) |
| `API_KEY` | Yes | Secret key for authenticating API requests. Leave empty to disable auth. |
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `REDIS_URL` | Yes | Redis connection string |
| `ALLOWED_ORIGINS` | No | Comma-separated allowed CORS origins. Default: `http://localhost:5173` |
| `MAX_FILE_BYTES` | No | Max upload size in bytes. Default: `10485760` (10 MB) |

### Frontend (`frontend/.env`)

| Variable | Required | Description |
|---|---|---|
| `VITE_API_URL` | Yes | Backend URL. Use `http://localhost:8000` for local dev |
| `VITE_API_KEY` | Yes | Must match `API_KEY` in backend `.env` |

---

## Security Notes

- **Never commit `.env` files** — they are in `.gitignore`
- **API keys in `docker-compose.yml`** — left empty by default; fill in locally only, never commit real values
- The `API_KEY` auth uses constant-time comparison (`secrets.compare_digest`) to prevent timing attacks
- Rate limiting is enforced per IP: 10 req/min on `/analyze`, 5 req/min on `/analyze/file`
- CORS is restricted to specific origins — wildcard `*` is not used
- File uploads are capped at 10 MB and read with a byte limit guard

---

## Database Admin (Adminer)

Visit `http://localhost:8080` when Docker is running.

| Field | Value |
|---|---|
| System | PostgreSQL |
| Server | `postgres` |
| Username | `sisa` |
| Password | `sisa_password` |
| Database | `sisa_db` |

---

## Troubleshooting

**CORS errors in browser**
- Make sure `ALLOWED_ORIGINS` in `docker-compose.yml` includes the URL you're accessing from (e.g., `http://localhost:5173` for Vite dev server, `http://localhost` for Docker frontend)

**AI insights show fallback/generic text**
- Check that `ANTHROPIC_API_KEY` is set and non-empty in `docker-compose.yml` (for Docker) or `backend/.env` (for local)
- Rebuild the Docker image after any env change: `docker compose up --build backend`

**Database connection error on startup**
- Make sure PostgreSQL container is healthy before the backend starts: `docker compose ps`
- If running locally (not Docker), start the DB first: `docker compose up -d postgres redis`

**Port conflicts**
- Port 8000 used by something else? Stop any local uvicorn or other Docker containers
- Run `netstat -ano | findstr :8000` to find the conflicting process

**Frontend not updating**
- For local dev: Vite hot-reloads automatically, just save the file
- For Docker: rebuild with `docker compose up --build frontend`

---

## Getting an OpenRouter API Key

1. Go to [openrouter.ai](https://openrouter.ai)
2. Sign up for a free account
3. Go to **Keys** → **Create Key**
4. Copy the key (starts with `sk-or-v1-`)
5. Paste it as `ANTHROPIC_API_KEY` in your `backend/.env`

OpenRouter gives you access to Claude and other AI models. The free tier is sufficient for development and demos.
