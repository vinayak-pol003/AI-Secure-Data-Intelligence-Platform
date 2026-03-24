import re
from typing import List, Dict

PATTERNS = {
    "email": {
        "pattern": r"[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}",
        "risk": "low"
    },
    "phone": {
        "pattern": r"\b(\+?\d{1,3}[\s\-]?)?(\(?\d{3}\)?[\s\-]?)(\d{3}[\s\-]?\d{4})\b",
        "risk": "low"
    },
    "api_key": {
        "pattern": r"(api[_\-]?key|apikey|api[_\-]?secret)\s*[=:]\s*['\"]?([A-Za-z0-9\-_]{16,})['\"]?",
        "risk": "high"
    },
    "password": {
        "pattern": r"(password|passwd|pwd|pass)\s*[=:]\s*['\"]?([^\s'\"]{4,})['\"]?",
        "risk": "critical"
    },
    "token": {
        "pattern": r"(token|auth_token|access_token|bearer)\s*[=:]\s*['\"]?([A-Za-z0-9\-_.]{16,})['\"]?",
        "risk": "high"
    },
    "secret_key": {
        "pattern": r"(secret[_\-]?key|secret)\s*[=:]\s*['\"]?([A-Za-z0-9\-_]{8,})['\"]?",
        "risk": "critical"
    },
    "aws_key": {
        "pattern": r"AKIA[0-9A-Z]{16}",
        "risk": "critical"
    },
    "private_key": {
        "pattern": r"-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----",
        "risk": "critical"
    },
    "jwt_token": {
        "pattern": r"eyJ[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+",
        "risk": "high"
    },
    "ip_address": {
        "pattern": r"\b(?:\d{1,3}\.){3}\d{1,3}\b",
        "risk": "low"
    },
    "credit_card": {
        "pattern": r"\b(?:\d{4}[\s\-]?){3}\d{4}\b",
        "risk": "critical"
    },
    "ssn": {
        "pattern": r"\b\d{3}-\d{2}-\d{4}\b",
        "risk": "critical"
    },
    "db_connection": {
        "pattern": r"(mongodb|mysql|postgresql|postgres|redis|jdbc)\s*://[^\s]+",
        "risk": "critical"
    },
}

class RegexDetector:
    def detect(self, content: str) -> List[Dict]:
        findings = []
        lines = content.splitlines()

        for line_num, line in enumerate(lines, 1):
            for finding_type, config in PATTERNS.items():
                matches = re.findall(config["pattern"], line, re.IGNORECASE)
                if matches:
                    match_val = matches[0] if isinstance(matches[0], str) else matches[0][-1]
                    masked_val = self._mask(str(match_val))
                    findings.append({
                        "type": finding_type,
                        "risk": config["risk"],
                        "line": line_num,
                        "value": masked_val,
                        "raw_line": line.strip()[:120]
                    })
        return findings

    def _mask(self, value: str) -> str:
        if len(value) <= 4:
            return "****"
        return value[:3] + "*" * (len(value) - 6) + value[-3:]