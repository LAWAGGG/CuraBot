import os
import re
import threading
import time
from urllib.parse import urlparse
from . import config

ALLOWED_HOSTS = {"docs.google.com", "drive.google.com"}
ID_RE = re.compile(r"^[A-Za-z0-9-_]{10,}$")
_SHEET_PATTERNS = [re.compile(r"/spreadsheets/d/([A-Za-z0-9-_]+)"), re.compile(r"[?&]id=([A-Za-z0-9-_]{10,})")]
_FOLDER_PATTERNS = [re.compile(r"/folders/([A-Za-z0-9-_]+)"), re.compile(r"[?&]id=([A-Za-z0-9-_]{10,})")]
_SCOPES = ["https://www.googleapis.com/auth/spreadsheets", "https://www.googleapis.com/auth/drive.readonly"]

_locks: dict[int, threading.Lock] = {}
_locks_guard = threading.Lock()
_sheet_cache: dict[int, tuple[float, str]] = {}
_drive_cache: dict[int, tuple[float, list]] = {}


def _lock_for(bot_id: int) -> threading.Lock:
    with _locks_guard:
        return _locks.setdefault(bot_id, threading.Lock())


def parse_google_id(kind: str, url: str) -> str:
    u = (url or "").strip()
    if len(u) > 2000:
        raise ValueError("URL terlalu panjang")
    try:
        host = urlparse(u).hostname or ""
    except Exception:
        raise ValueError("URL tidak valid")
    if host not in ALLOWED_HOSTS:
        raise ValueError("Hanya link docs.google.com / drive.google.com")
    pats = _SHEET_PATTERNS if kind == "sheet" else _FOLDER_PATTERNS
    for p in pats:
        m = p.search(u)
        if m and ID_RE.match(m.group(1)):
            return m.group(1)
    raise ValueError("ID Google tidak ditemukan di link")


def _creds():
    from google.oauth2 import service_account
    path = config.GOOGLE_CREDENTIALS_PATH
    if not path or not os.path.isfile(path):
        raise RuntimeError("Kredensial Google belum dikonfigurasi (GOOGLE_CREDENTIALS_PATH)")
    return service_account.Credentials.from_service_account_file(path, scopes=_SCOPES)


def _drive_service():
    from googleapiclient.discovery import build
    return build("drive", "v3", credentials=_creds(), cache_discovery=False)


def guess_mapping(headers: list) -> dict:
    def find(*keys):
        for i, h in enumerate(headers):
            hl = re.sub(r"[^a-z0-9 ]", "", (h or "").lower())
            if any(k in hl for k in keys):
                return i
        return None
    return {
        "name_col": find("nama", "produk", "product", "item", "barang", "menu"),
        "price_col": find("harga", "price", "rp", "tarif"),
        "stock_col": find("stok", "stock", "sisa", "qty", "jumlah", "persediaan"),
        "image_col": find("gambar", "image", "foto", "drive"),
    }


def _norm(s: str) -> str:
    return re.sub(r"\s+", " ", (s or "").lower().strip())


def fuzzy_find(name: str, candidates: list) -> str | None:
    n = _norm(name)
    if not n:
        return None
    for c in candidates:
        if n and n in _norm(c):
            return c
    words = [w for w in re.findall(r"[a-z0-9]+", n) if len(w) > 3]
    if not words:
        return None
    for c in candidates:
        cl = _norm(c)
        if all(w in cl for w in words):
            return c
    return None


def read_sheet_rows(source) -> tuple:
    import gspread
    gc = gspread.service_account(filename=config.GOOGLE_CREDENTIALS_PATH)
    sh = gc.open_by_key(source.external_id)
    ws = sh.worksheet(source.tab) if source.tab else sh.sheet1
    values = ws.get_all_values()
    if not values:
        return [], [], guess_mapping([])
    headers = [(c or "").strip() for c in values[0]]
    rows = [r for r in values[1:] if any((c or "").strip() for c in r)]
    auto = guess_mapping(headers)
    saved = source.mapping or {}
    mapping = {**auto, **{k: v for k, v in saved.items() if v is not None}}
    return headers, rows, mapping


def sheet_context(bot_id: int, db) -> str:
    from .models import BotExternalSource
    now = time.time()
    hit = _sheet_cache.get(bot_id)
    if hit and now - hit[0] < config.GOOGLE_SHEET_TTL:
        return hit[1]
    lines: list[str] = []
    sources = db.query(BotExternalSource).filter(BotExternalSource.bot_id == bot_id, BotExternalSource.kind == "sheet").all()
    for s in sources:
        try:
            headers, rows, _m = read_sheet_rows(s)
            # ponytail: AI baca semua kolom apa adanya, tanpa mapping manual
            labels = [(h or f"Kolom{i + 1}").strip() for i, h in enumerate(headers)]
            for r in rows:
                parts = []
                for i, h in enumerate(labels):
                    v = (r[i].strip() if i < len(r) and r[i] else "")
                    if v:
                        parts.append(f"{h}: {v}"[:150])
                if not parts:
                    continue
                lines.append("- " + " | ".join(parts))
                if len("\n".join(lines)) > 7500:
                    break
            s.last_error = None
        except Exception as e:
            s.last_error = _safe_err(e)
    try:
        db.commit()
    except Exception:
        db.rollback()
    ctx = "Katalog Google Sheets:\n" + "\n".join(lines[:200]) if lines else ""
    _sheet_cache[bot_id] = (now, ctx)
    return ctx


def list_drive_images(source) -> list:
    now = time.time()
    hit = _drive_cache.get(source.id)
    if hit and now - hit[0] < config.GOOGLE_DRIVE_TTL:
        return hit[1]
    svc = _drive_service()
    out, token = [], None
    while True:
        resp = svc.files().list(q=f"'{source.external_id}' in parents and trashed=false", fields="files(id,name,mimeType),nextPageToken", pageSize=100, pageToken=token).execute(num_retries=2)
        for f in resp.get("files", []):
            if (f.get("mimeType") or "").startswith("image/"):
                out.append({"id": f["id"], "name": f.get("name", "")})
        token = resp.get("nextPageToken")
        if not token:
            break
    _drive_cache[source.id] = (now, out)
    return out


def download_drive_image(file_id: str) -> bytes:
    if not ID_RE.match(file_id or ""):
        raise ValueError("file_id tidak valid")
    from googleapiclient.http import MediaIoBaseDownload
    import io as _io
    svc = _drive_service()
    req = svc.files().get_media(fileId=file_id)
    buf = _io.BytesIO()
    dl = MediaIoBaseDownload(buf, req)
    done = False
    while not done:
        _, done = dl.next_chunk()
    data = buf.getvalue()
    if not data or len(data) > 25 * 1024 * 1024:
        raise ValueError("Ukuran gambar Drive tidak valid")
    return data


def adjust_stock(source, product_name: str, delta: int) -> bool:
    import gspread
    with _lock_for(source.bot_id):
        gc = gspread.service_account(filename=config.GOOGLE_CREDENTIALS_PATH)
        sh = gc.open_by_key(source.external_id)
        ws = sh.worksheet(source.tab) if source.tab else sh.sheet1
        values = ws.get_all_values()
        if len(values) < 2:
            return False
        headers = values[0]
        m = {**guess_mapping(headers), **{k: v for k, v in (source.mapping or {}).items() if v is not None}}
        nc, sc = m.get("name_col"), m.get("stock_col")
        if nc is None or sc is None:
            return False
        names = [((r[nc] if nc < len(r) else "") or "") for r in values[1:]]
        target = fuzzy_find(product_name, names)
        if not target:
            return False
        idx = names.index(target) + 2
        try:
            cur = int(str(values[idx - 1][sc]).strip() or "0")
        except (ValueError, IndexError):
            return False
        ws.update_cell(idx, sc + 1, str(max(0, cur + delta)))
        _sheet_cache.pop(source.bot_id, None)
        return True


def _safe_err(e: Exception) -> str:
    msg = f"{type(e).__name__}: {e}"
    for secret in (config.GOOGLE_CREDENTIALS_PATH,):
        if secret:
            msg = msg.replace(secret, "[redacted]")
    return msg[:500]
