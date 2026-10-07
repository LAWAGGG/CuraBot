import re

_MARKER = re.compile(r"\[\s*IMG:\s*([^\]\n]+?)\s*\]", re.IGNORECASE)

def parse_image_markers(text: str) -> tuple[str, list[str]]:
    files = []
    for m in _MARKER.finditer(text or ""):
        name = m.group(1).strip()
        if name and name not in files:
            files.append(name)
    clean = _MARKER.sub("", text or "")
    clean = re.sub(r"\n{3,}", "\n\n", clean).strip()
    return clean, files
