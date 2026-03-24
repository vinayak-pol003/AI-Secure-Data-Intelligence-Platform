import os
import secrets
import uuid
from contextlib import asynccontextmanager
from typing import Optional

import uvicorn
from dotenv import load_dotenv
from fastapi import Depends, FastAPI, File, Header, HTTPException, Query, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

load_dotenv()  # load .env when running locally

from ai.claude_client import get_ai_insights
from cache import close_redis, get_cached, get_redis, make_cache_key, set_cached
from database import get_db, init_db
from detectors.log_analyzer import LogAnalyzer
from detectors.regex_detector import RegexDetector
from engines.policy_engine import PolicyEngine
from engines.risk_engine import RiskEngine
from models import ScanResult
from parsers.file_parser import parse_file
from parsers.log_parser import parse_log
from parsers.text_parser import parse_text

# ── Config from environment ──────────────────────────────────────────────────
API_KEY = os.getenv("API_KEY", "")              # empty → auth disabled (dev mode)
MAX_FILE_BYTES = int(os.getenv("MAX_FILE_BYTES", str(10 * 1024 * 1024)))  # default 10 MB
ALLOWED_ORIGINS = [o.strip() for o in os.getenv("ALLOWED_ORIGINS", "http://localhost:5173").split(",")]

# ── Rate limiter ──────────────────────────────────────────────────────────────
limiter = Limiter(key_func=get_remote_address)

# ── Swagger tag metadata ──────────────────────────────────────────────────────
tags_metadata = [
    {
        "name": "Analysis",
        "description": "Submit text, SQL, chat, or log content—and uploaded files—for security scanning.",
    },
    {
        "name": "History",
        "description": "Retrieve past scan results persisted in **PostgreSQL**.",
    },
    {
        "name": "Health",
        "description": "Liveness and dependency health checks (API, PostgreSQL, Redis).",
    },
]


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()   # create tables if they don't exist
    yield
    await close_redis()


app = FastAPI(
    title="AI Secure Data Intelligence Platform",
    swagger_ui_parameters={"persistAuthorization": True},
    version="1.0.0",
    description=(
        "**SISA** — detects PII and sensitive data in text, logs, SQL, chat, and documents. "
        "Results are cached in **Redis** (5 min TTL) and persisted to **PostgreSQL**. "
        "Interactive docs available at `/docs` (Swagger UI) and `/redoc`."
    ),
    openapi_tags=tags_metadata,
    lifespan=lifespan,
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type", "X-API-Key"],
)


# ── Request / Response models ────────────────────────────────────────────────
class AnalyzeRequest(BaseModel):
    input_type: str  # text | sql | chat | log
    content: str
    options: Optional[dict] = {"mask": True, "block_high_risk": False, "log_analysis": True}


class ScanSummary(BaseModel):
    id: str
    created_at: str
    content_type: str
    filename: Optional[str]
    risk_score: float
    risk_level: str
    action: str
    summary: str


# ── Auth dependency ──────────────────────────────────────────────────────────
async def verify_api_key(x_api_key: str = Header(default="")) -> None:
    """Validate the X-API-Key header. A no-op when API_KEY is not configured."""
    if not API_KEY:
        return  # auth is disabled in dev/unset mode
    if not secrets.compare_digest(x_api_key, API_KEY):
        raise HTTPException(status_code=401, detail="Invalid or missing API key")


# ── Shared service objects ────────────────────────────────────────────────────
regex_detector = RegexDetector()
log_analyzer   = LogAnalyzer()
risk_engine    = RiskEngine()
policy_engine  = PolicyEngine()


# ── Internal helper ───────────────────────────────────────────────────────────
async def _persist_scan(
    db: AsyncSession,
    result: dict,
    content_type: str,
    filename: Optional[str] = None,
) -> str:
    scan = ScanResult(
        id=uuid.uuid4(),
        content_type=content_type,
        filename=filename,
        risk_score=result["risk_score"],
        risk_level=result["risk_level"],
        action=result["action"],
        summary=result["summary"],
        findings=result["findings"],
        insights=result["insights"],
    )
    db.add(scan)
    await db.commit()
    return str(scan.id)


# ── Endpoints ─────────────────────────────────────────────────────────────────
@app.post(
    "/analyze",
    tags=["Analysis"],
    summary="Analyze text / SQL / chat / log content",
)
@limiter.limit("10/minute")
async def analyze(
    request: Request,
    body: AnalyzeRequest,
    db: AsyncSession = Depends(get_db),
    _: None = Depends(verify_api_key),
):
    # ── Redis cache check ──────────────────────────────────────────────────
    cache_key = make_cache_key(body.content, body.input_type)
    cached = await get_cached(cache_key)
    if cached:
        return {**cached, "cached": True}

    try:
        parsed = parse_log(body.content) if body.input_type == "log" else parse_text(body.content)

        findings = regex_detector.detect(parsed["content"])
        if body.input_type == "log" or (body.options or {}).get("log_analysis"):
            findings.extend(log_analyzer.analyze(parsed["content"]))

        seen: set = set()
        unique_findings = []
        for f in findings:
            key = (f.get("type"), f.get("line"), f.get("value", ""))
            if key not in seen:
                seen.add(key)
                unique_findings.append(f)

        risk_result = risk_engine.score(unique_findings)
        content_out = policy_engine.apply(parsed["content"], unique_findings, body.options or {})
        insights    = await get_ai_insights(unique_findings, risk_result, body.input_type)

        result = {
            "summary":        insights.get("summary", "Analysis complete"),
            "content_type":   body.input_type,
            "findings":       unique_findings,
            "risk_score":     risk_result["score"],
            "risk_level":     risk_result["level"],
            "action":         policy_engine.get_action(body.options or {}, risk_result),
            "insights":       insights.get("insights", []),
            "masked_content": content_out,
            "line_count":     parsed.get("line_count", 0),
        }

        result["scan_id"] = await _persist_scan(db, result, body.input_type)
        await set_cached(cache_key, result)
        return {**result, "cached": False}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post(
    "/analyze/file",
    tags=["Analysis"],
    summary="Analyze an uploaded file (PDF, DOCX, TXT, LOG …)",
)
@limiter.limit("5/minute")
async def analyze_file(
    request: Request,
    file: UploadFile = File(...),
    mask: bool = True,
    db: AsyncSession = Depends(get_db),
    _: None = Depends(verify_api_key),
):
    try:
        content_bytes = await file.read(MAX_FILE_BYTES + 1)
        if len(content_bytes) > MAX_FILE_BYTES:
            raise HTTPException(
                status_code=413,
                detail=f"File exceeds maximum allowed size of {MAX_FILE_BYTES // (1024 * 1024)} MB",
            )
        filename  = file.filename or ""
        ext       = filename.rsplit(".", 1)[-1].lower() if "." in filename else "txt"

        cache_key = make_cache_key(content_bytes.decode("utf-8", errors="replace"), filename)
        cached    = await get_cached(cache_key)
        if cached:
            return {**cached, "cached": True}

        parsed     = parse_file(content_bytes, ext, filename)
        input_type = "log" if ext == "log" else "file"

        findings = regex_detector.detect(parsed["content"])
        findings.extend(log_analyzer.analyze(parsed["content"]))

        seen: set = set()
        unique_findings = []
        for f in findings:
            key = (f.get("type"), f.get("line"), f.get("value", ""))
            if key not in seen:
                seen.add(key)
                unique_findings.append(f)

        options     = {"mask": mask, "block_high_risk": False}
        risk_result = risk_engine.score(unique_findings)
        content_out = policy_engine.apply(parsed["content"], unique_findings, options)
        insights    = await get_ai_insights(unique_findings, risk_result, input_type)

        result = {
            "summary":        insights.get("summary", "File analysis complete"),
            "content_type":   input_type,
            "filename":       filename,
            "findings":       unique_findings,
            "risk_score":     risk_result["score"],
            "risk_level":     risk_result["level"],
            "action":         policy_engine.get_action(options, risk_result),
            "insights":       insights.get("insights", []),
            "masked_content": content_out,
            "line_count":     parsed.get("line_count", 0),
        }

        result["scan_id"] = await _persist_scan(db, result, input_type, filename)
        await set_cached(cache_key, result)
        return {**result, "cached": False}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Scan history ──────────────────────────────────────────────────────────────
@app.get(
    "/scans",
    tags=["History"],
    summary="List recent scan results",
    response_model=list[ScanSummary],
)
async def list_scans(
    limit: int = Query(20, ge=1, le=100, description="Max records to return"),
    offset: int = Query(0, ge=0, description="Pagination offset"),
    db: AsyncSession = Depends(get_db),
    _: None = Depends(verify_api_key),
):
    rows = await db.execute(
        select(ScanResult).order_by(desc(ScanResult.created_at)).offset(offset).limit(limit)
    )
    return [
        ScanSummary(
            id=str(s.id),
            created_at=s.created_at.isoformat(),
            content_type=s.content_type,
            filename=s.filename,
            risk_score=s.risk_score,
            risk_level=s.risk_level,
            action=s.action,
            summary=s.summary,
        )
        for s in rows.scalars().all()
    ]


@app.get(
    "/scans/{scan_id}",
    tags=["History"],
    summary="Get the full details of a single scan",
)
async def get_scan(scan_id: str, db: AsyncSession = Depends(get_db), _: None = Depends(verify_api_key)):
    try:
        uid = uuid.UUID(scan_id)
    except ValueError:
        raise HTTPException(status_code=422, detail="Invalid scan_id format")

    row = await db.execute(select(ScanResult).where(ScanResult.id == uid))
    scan = row.scalar_one_or_none()
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")

    return {
        "id":           str(scan.id),
        "created_at":   scan.created_at.isoformat(),
        "content_type": scan.content_type,
        "filename":     scan.filename,
        "risk_score":   scan.risk_score,
        "risk_level":   scan.risk_level,
        "action":       scan.action,
        "summary":      scan.summary,
        "findings":     scan.findings,
        "insights":     scan.insights,
    }


# ── Health ────────────────────────────────────────────────────────────────────
@app.get(
    "/health",
    tags=["Health"],
    summary="Check service, database, and cache health",
)
async def health(db: AsyncSession = Depends(get_db)):
    checks: dict[str, str] = {"api": "ok", "database": "unknown", "cache": "unknown"}

    try:
        from sqlalchemy import text
        await db.execute(text("SELECT 1"))
        checks["database"] = "ok"
    except Exception as exc:
        checks["database"] = f"error: {exc}"

    try:
        r = await get_redis()
        await r.ping()
        checks["cache"] = "ok"
    except Exception as exc:
        checks["cache"] = f"error: {exc}"

    overall = "ok" if all(v == "ok" for v in checks.values()) else "degraded"
    return {"status": overall, "service": "AI Secure Data Intelligence Platform", "checks": checks}


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)