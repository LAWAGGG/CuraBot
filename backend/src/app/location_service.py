import re
import threading
import time

import httpx

_CACHE: dict[str, str | None] = {}
_LOCK = threading.Lock()
_LAST_CALL = 0.0

_MARKER = re.compile(r"\[\[LOC:\s*(.+?)\s*\]\]")


def _geocode(query: str) -> str | None:
    global _LAST_CALL
    key = query.strip().lower()
    with _LOCK:
        if key in _CACHE:
            return _CACHE[key]
        # ponytail: Nominatim rate limit 1 req/s, global lock -> antre, cukup untuk volume bot kecil
        wait = 1.1 - (time.monotonic() - _LAST_CALL)
        if wait > 0:
            time.sleep(wait)
        _LAST_CALL = time.monotonic()
    try:
        r = httpx.get(
            "https://nominatim.openstreetmap.org/search",
            params={"format": "jsonv2", "limit": 1, "accept-language": "id", "q": query},
            headers={"User-Agent": "CuraBot/1.0 (telegram bot lokasi)"},
            timeout=10,
        )
        r.raise_for_status()
        data = r.json()
        if not data:
            with _LOCK:
                _CACHE[key] = None
            return None
        lat, lon = data[0]["lat"], data[0]["lon"]
        url = f"https://www.google.com/maps?q={lat},{lon}"
        with _LOCK:
            _CACHE[key] = url
        return url
    except Exception:
        with _LOCK:
            _CACHE[key] = None
        return None


def enrich_with_maps(text: str, coords: str | None = None) -> str:
    """Ubah marker [[LOC: alamat]] jadi SATU blok lokasi baku (anti duplikat)."""
    if "[[LOC:" not in text:
        return text
    count = 0
    direct_url = f"https://www.google.com/maps?q={coords.replace(' ', '')}" if coords else None

    def _repl(m: re.Match) -> str:
        nonlocal count
        count += 1
        query = m.group(1).strip()
        if count > 3:
            return query
        # ponytail: coords dari picker = lokasi toko hasil tap/search user, presisi; skip re-geocode nama
        url = direct_url or _geocode(query)
        if not url:
            return query
        return f"📍Lokasi:\n{query}\nMaps: {url}"

    return _MARKER.sub(_repl, text).strip()
