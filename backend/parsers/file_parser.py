from typing import Dict
from parsers.pdf_parser import parse_pdf
from parsers.doc_parser import parse_doc


def parse_file(content_bytes: bytes, ext: str, filename: str = "") -> Dict:
    """
    Route file bytes to the appropriate parser based on extension.
    Supports: pdf, doc, docx, txt, log, and generic text fallback.
    """
    ext = ext.lower()

    if ext == "pdf":
        return parse_pdf(content_bytes, filename)

    if ext in ("doc", "docx"):
        return parse_doc(content_bytes, filename, ext)

    # txt, log, csv, or anything else — decode as UTF-8
    content = content_bytes.decode("utf-8", errors="ignore")
    lines = content.splitlines()
    return {
        "content": content,
        "lines": lines,
        "line_count": len(lines),
        "filename": filename,
        "file_type": ext,
    }
