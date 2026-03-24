import re
from typing import List, Dict

SENSITIVE_PATTERNS = [
    r"(password|passwd|pwd)\s*[=:]\s*['\"]?([^\s'\"]{4,})['\"]?",
    r"(api[_\-]?key|apikey)\s*[=:]\s*['\"]?([A-Za-z0-9\-_]{16,})['\"]?",
    r"(token|access_token)\s*[=:]\s*['\"]?([A-Za-z0-9\-_.]{16,})['\"]?",
    r"(secret[_\-]?key|secret)\s*[=:]\s*['\"]?([A-Za-z0-9\-_]{8,})['\"]?",
    r"AKIA[0-9A-Z]{16}",
]

class PolicyEngine:
    def apply(self, content: str, findings: List[Dict], options: Dict) -> str:
        if not options.get("mask", True):
            return content

        masked = content
        for pattern in SENSITIVE_PATTERNS:
            def replace_match(m):
                full = m.group(0)
                if len(m.groups()) >= 2:
                    val = m.group(2)
                    masked_val = val[:2] + "***MASKED***" + val[-2:] if len(val) > 4 else "***MASKED***"
                    return full.replace(val, masked_val)
                return "***MASKED***"
            masked = re.sub(pattern, replace_match, masked, flags=re.IGNORECASE)

        return masked

    def get_action(self, options: Dict, risk_result: Dict) -> str:
        if options.get("block_high_risk") and risk_result["level"] in ["high", "critical"]:
            return "blocked"
        if options.get("mask"):
            return "masked"
        return "allowed"