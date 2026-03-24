def parse_log(content: str) -> dict:
    lines = content.splitlines()
    parsed_lines = []
    for i, line in enumerate(lines, 1):
        parsed_lines.append({
            "line_number": i,
            "raw": line,
            "is_error": any(kw in line.upper() for kw in ["ERROR", "EXCEPTION", "FATAL", "CRITICAL"]),
            "is_warning": "WARN" in line.upper(),
            "is_info": "INFO" in line.upper(),
            "is_debug": "DEBUG" in line.upper(),
        })
    return {
        "content": content,
        "lines": parsed_lines,
        "line_count": len(lines),
        "error_count": sum(1 for l in parsed_lines if l["is_error"]),
        "warning_count": sum(1 for l in parsed_lines if l["is_warning"]),
    }