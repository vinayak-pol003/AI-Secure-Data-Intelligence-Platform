import io
from typing import Dict


def parse_pdf(content_bytes: bytes, filename: str = "") -> Dict:
    """
    Parse a PDF file and extract text content page by page.
    Returns structured content with line count and page info.
    """
    content = ""
    page_count = 0

    try:
        import pdfplumber
        with pdfplumber.open(io.BytesIO(content_bytes)) as pdf:
            page_count = len(pdf.pages)
            pages_text = []
            for i, page in enumerate(pdf.pages, 1):
                text = page.extract_text() or ""
                if text.strip():
                    pages_text.append(f"--- PAGE {i} ---\n{text}")
            content = "\n\n".join(pages_text)

    except ImportError:
        # Fallback: try pypdf
        try:
            import pypdf
            reader = pypdf.PdfReader(io.BytesIO(content_bytes))
            page_count = len(reader.pages)
            pages_text = []
            for i, page in enumerate(reader.pages, 1):
                text = page.extract_text() or ""
                if text.strip():
                    pages_text.append(f"--- PAGE {i} ---\n{text}")
            content = "\n\n".join(pages_text)
        except Exception:
            content = content_bytes.decode("utf-8", errors="ignore")

    except Exception as e:
        # Last resort: decode raw bytes
        content = content_bytes.decode("utf-8", errors="ignore")

    lines = content.splitlines()

    return {
        "content": content,
        "lines": lines,
        "line_count": len(lines),
        "page_count": page_count,
        "filename": filename,
        "file_type": "pdf"
    }