from typing import Dict


def parse_text(content: str) -> Dict:
    """
    Parse plain text / SQL / chat content into a structured dict
    compatible with the analyzer pipeline.
    """
    lines = content.splitlines()
    return {
        "content": content,
        "lines": lines,
        "line_count": len(lines),
    }
