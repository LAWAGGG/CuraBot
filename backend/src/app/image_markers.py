import re

# ponytail: filenames containing "]" are not parseable by the marker; Telegram catalog filenames with "]" are unsupported.
# Also matches empty markers like "[IMG: ]" so they can be stripped from clean text.
_MARKER = re.compile(r"\[\s*IMG:\s*([^\]\n]*?)\s*\]", re.IGNORECASE)
_VMARKER = re.compile(r"\[\s*VID:\s*([^\]\n]*?)\s*\]", re.IGNORECASE)

def _parse_one(pat, text: str) -> tuple[str, list[str]]:
    text = (text or "").replace("\r\n", "\n").replace("\r", "\n")
    files = []
    for m in pat.finditer(text):
        name = m.group(1).strip()
        if name and name not in files:
            files.append(name)
    clean = pat.sub("", text or "")
    clean = re.sub(r"\n{3,}", "\n\n", clean).strip()
    return clean, files

def parse_image_markers(text: str) -> tuple[str, list[str]]:
    return _parse_one(_MARKER, text)

def parse_video_markers(text: str) -> tuple[str, list[str]]:
    return _parse_one(_VMARKER, text)

def parse_media_markers(text: str) -> tuple[str, list[str], list[str]]:
    """Strip IMG + VID sekaligus. Return (clean, images, videos)."""
    clean, images = _parse_one(_MARKER, text)
    clean, videos = _parse_one(_VMARKER, clean)
    return clean, images, videos
