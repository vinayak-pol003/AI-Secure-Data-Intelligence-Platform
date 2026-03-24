import re
from typing import List, Dict
from collections import defaultdict

class LogAnalyzer:
    def analyze(self, content: str) -> List[Dict]:
        findings = []
        lines = content.splitlines()

        # Track for brute force detection
        failed_logins = []
        ip_counts = defaultdict(int)

        for line_num, line in enumerate(lines, 1):
            line_lower = line.lower()

            # Stack trace detection
            if re.search(r"(exception|stack trace|at [a-z]+\.[a-z]+\.[A-Z]|\.java:\d+|\.py:\d+|\.js:\d+|traceback)", line, re.IGNORECASE):
                findings.append({
                    "type": "stack_trace",
                    "risk": "medium",
                    "line": line_num,
                    "value": line.strip()[:100],
                    "raw_line": line.strip()[:120]
                })

            # Debug mode leak
            if re.search(r"(debug\s*=\s*true|debug\s*mode\s*on|verbose\s*=\s*true)", line, re.IGNORECASE):
                findings.append({
                    "type": "debug_mode_leak",
                    "risk": "medium",
                    "line": line_num,
                    "value": line.strip()[:100],
                    "raw_line": line.strip()[:120]
                })

            # Failed login attempts
            if re.search(r"(failed login|login failed|authentication failed|invalid credentials|wrong password|unauthorized)", line, re.IGNORECASE):
                failed_logins.append(line_num)

            # SQL errors (potential SQL injection traces)
            if re.search(r"(sql error|syntax error.*sql|ora-\d+|mysql error|pg error)", line, re.IGNORECASE):
                findings.append({
                    "type": "sql_error_leak",
                    "risk": "medium",
                    "line": line_num,
                    "value": line.strip()[:100],
                    "raw_line": line.strip()[:120]
                })

            # Suspicious IP activity
            ips = re.findall(r"\b(?:\d{1,3}\.){3}\d{1,3}\b", line)
            for ip in ips:
                ip_counts[ip] += 1

            # Hardcoded credentials pattern in logs
            if re.search(r"(connecting with|logged in as|authenticated as|user:)\s*\S+\s+(password|pwd|pass):", line, re.IGNORECASE):
                findings.append({
                    "type": "hardcoded_credentials",
                    "risk": "critical",
                    "line": line_num,
                    "value": "Credentials detected in log",
                    "raw_line": line.strip()[:120]
                })

            # Internal path disclosure
            if re.search(r"(\/home\/|\/var\/|\/etc\/|C:\\Users\\|C:\\Windows\\)", line):
                findings.append({
                    "type": "path_disclosure",
                    "risk": "low",
                    "line": line_num,
                    "value": line.strip()[:100],
                    "raw_line": line.strip()[:120]
                })

        # Brute force detection (5+ failed logins)
        if len(failed_logins) >= 5:
            findings.append({
                "type": "brute_force_attempt",
                "risk": "high",
                "line": failed_logins[0],
                "value": f"{len(failed_logins)} failed login attempts detected",
                "raw_line": f"Lines: {failed_logins[:5]}"
            })

        # Suspicious IP (hitting 10+ times)
        for ip, count in ip_counts.items():
            if count >= 10:
                findings.append({
                    "type": "suspicious_ip",
                    "risk": "medium",
                    "line": 0,
                    "value": f"{ip} appeared {count} times",
                    "raw_line": f"IP {ip} hit {count} times in logs"
                })

        return findings