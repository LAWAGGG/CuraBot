import re

# ponytail: filenames containing "]" are not parseable by the marker; Telegram catalog filenames with "]" are unsupported.
_MARKER = re.compile(r"\[\s*IMG:\s*(\S[^\]\n]*?)\s*\]", re.IGNORECASE)

def parse_image_markers(text: str) -> tuple[str, list[str]]:
    text = (text or "").replace("\r\n", "\n").replace("\r", "\n")
    files = []
    for m in _MARKER.finditer(text):
        name = m.group(1).strip()
        if name and name not in files:
            files.append(name)
    clean = _MARKER.sub("", text or "")
    clean = re.sub(r"\n{3,}", "\n\n", clean).strip()
    return clean, files
