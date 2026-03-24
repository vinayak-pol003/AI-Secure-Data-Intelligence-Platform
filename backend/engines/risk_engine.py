from typing import List, Dict

RISK_WEIGHTS = {
    "critical": 4,
    "high": 3,
    "medium": 2,
    "low": 1,
}

RISK_LEVELS = [
    (0, "clean"),
    (3, "low"),
    (6, "medium"),
    (10, "high"),
    (float("inf"), "critical"),
]

class RiskEngine:
    def score(self, findings: List[Dict]) -> Dict:
        if not findings:
            return {"score": 0, "level": "clean", "breakdown": {}}

        total = 0
        breakdown = {}

        for f in findings:
            risk = f.get("risk", "low")
            weight = RISK_WEIGHTS.get(risk, 1)
            total += weight
            breakdown[risk] = breakdown.get(risk, 0) + 1

        level = "clean"
        for threshold, lvl in RISK_LEVELS:
            if total <= threshold:
                level = lvl
                break

        return {
            "score": total,
            "level": level,
            "breakdown": breakdown,
            "total_findings": len(findings)
        }