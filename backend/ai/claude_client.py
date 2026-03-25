import httpx
import json
import os
import logging
from pathlib import Path
from typing import List, Dict

from dotenv import load_dotenv

# Load .env relative to this file's location so it works regardless of cwd
# Do NOT use override=True — Docker Compose env vars must take precedence
load_dotenv(dotenv_path=Path(__file__).parent.parent / ".env")

logger = logging.getLogger(__name__)
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "").strip()

async def get_ai_insights(findings: List[Dict], risk_result: Dict, input_type: str) -> Dict:
    if not findings:
        return {
            "summary": "No security issues detected. Content appears clean.",
            "insights": ["No sensitive data or security risks found."]
        }

    findings_text = "\n".join([
        f"- Line {f.get('line', '?')}: [{f.get('risk', 'low').upper()}] {f.get('type', 'unknown')} — {f.get('value', '')}"
        for f in findings[:20]
    ])

    prompt = f"""You are a security analyst AI. Analyze these security findings from a {input_type} file and provide:
1. A concise 1-2 sentence summary of the overall security situation
2. 3-5 specific, actionable security insights

Findings:
{findings_text}

Risk Score: {risk_result['score']} | Risk Level: {risk_result['level'].upper()}
Breakdown: {risk_result.get('breakdown', {})}

Respond ONLY with valid JSON in this exact format (no markdown, no backticks):
{{
  "summary": "...",
  "insights": ["insight 1", "insight 2", "insight 3"]
}}"""

    _dbg = f"key={'SET' if ANTHROPIC_API_KEY else 'EMPTY'} len={len(ANTHROPIC_API_KEY)}"
    logger.info("AI insights request: %s", _dbg)
    if not ANTHROPIC_API_KEY:
        logger.warning("ANTHROPIC_API_KEY not set — using fallback insights")
        return _fallback_insights(findings, risk_result)

    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                "https://openrouter.ai/api/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {ANTHROPIC_API_KEY}",
                    "Content-Type": "application/json",
                    "HTTP-Referer": "https://sentinel-ai-iota-plum.vercel.app",
                    "X-Title": "SISA Security Platform",
                },
                json={
                    "model": "anthropic/claude-sonnet-4-5",
                    "max_tokens": 600,
                    "messages": [{"role": "user", "content": prompt}]
                }
            )
            logger.info("OpenRouter response status: %s", resp.status_code)
            if resp.status_code != 200:
                logger.error("OpenRouter error body: %s", resp.text[:500])
                return _fallback_insights(findings, risk_result)
            data = resp.json()
            text = data["choices"][0]["message"]["content"].strip()
            text = text.replace("```json", "").replace("```", "").strip()
            result = json.loads(text)
            logger.info("*** REAL CLAUDE AI *** summary len=%d", len(result.get("summary", "")))
            return result
    except Exception as e:
        logger.error("OpenRouter call failed: %s: %s", type(e).__name__, e)
        return _fallback_insights(findings, risk_result)


def _fallback_insights(findings: List[Dict], risk_result: Dict) -> Dict:
    types = list(set(f.get("type") for f in findings))
    critical = [f for f in findings if f.get("risk") == "critical"]
    high = [f for f in findings if f.get("risk") == "high"]

    insights = []
    if critical:
        insights.append(f"CRITICAL: {len(critical)} critical risk(s) found including {critical[0].get('type')} — immediate action required.")
    if high:
        insights.append(f"HIGH RISK: {len(high)} high-severity finding(s) detected — review and rotate any exposed credentials.")
    if "stack_trace" in types:
        insights.append("Stack traces expose internal system details — disable verbose error logging in production.")
    if "brute_force_attempt" in types:
        insights.append("Multiple failed login attempts detected — consider rate limiting or IP blocking.")
    if "debug_mode_leak" in types:
        insights.append("Debug mode is enabled — turn off debug logging in production environments.")
    if not insights:
        insights.append(f"Found {len(findings)} issue(s) of types: {', '.join(types[:3])}. Review and remediate.")

    summary = f"Analysis found {len(findings)} security issue(s) with risk level: {risk_result['level'].upper()}."
    if critical:
        summary = f"CRITICAL security issues detected — {len(critical)} critical finding(s) require immediate attention."

    return {"summary": summary, "insights": insights}
