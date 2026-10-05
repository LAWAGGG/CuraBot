import os
from dotenv import load_dotenv

load_dotenv()

DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = int(os.getenv("DB_PORT", "3306"))
DB_USER = os.getenv("DB_USER", "root")
DB_PASSWORD = os.getenv("DB_PASSWORD", "")
DB_NAME = os.getenv("DB_NAME", "curabot")

JWT_SECRET = os.getenv("JWT_SECRET", "change_me_min_32_chars_secret_key!!")
JWT_EXPIRE_DAYS = int(os.getenv("JWT_EXPIRE_DAYS", "30"))
TELEGRAM_WEBHOOK_SECRET = os.getenv("TELEGRAM_WEBHOOK_SECRET", "")
ENCRYPTION_KEY = os.getenv("ENCRYPTION_KEY", "")

BASE_URL = os.getenv("BASE_URL", "http://localhost:8000").rstrip("/")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173").rstrip("/")

# Comma-separated list; defaults to FRONTEND_URL when unset/empty.
_cors_origins_env = os.getenv("CORS_ORIGINS") or FRONTEND_URL
CORS_ORIGINS = [o.strip().rstrip("/") for o in _cors_origins_env.split(",") if o.strip()]
# Dev-friendly pattern: any localhost/127.0.0.1 port and any Cloudflare quick tunnel.
CORS_ORIGIN_REGEX = os.getenv("CORS_ORIGIN_REGEX") or (
    r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$"
    r"|^https://[a-z0-9-]+\.trycloudflare\.com$"
)

_BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
_upload_env = os.getenv("UPLOAD_DIR", "uploads")
UPLOAD_DIR = _upload_env if os.path.isabs(_upload_env) else os.path.join(_BASE_DIR, _upload_env)


def resolve_upload_path(path: str | None) -> str | None:
    if not path:
        return None
    if os.path.isabs(path):
        return path
    normalized = path.replace("\\", "/")
    if normalized.startswith("uploads/"):
        normalized = normalized[len("uploads/"):]
    while normalized.startswith("../"):
        normalized = normalized[3:]
    return os.path.join(UPLOAD_DIR, normalized)


def upload_url(bot_id: int, path: str | None) -> str | None:
    if not path:
        return None
    return f"{BASE_URL}/uploads/{bot_id}/{os.path.basename(path)}"


def chat_media_url(bot_id: int, path: str | None) -> str | None:
    if not path:
        return None
    return f"{BASE_URL}/api/media/{bot_id}/{os.path.basename(path)}"


MAX_FILE_SIZE = int(os.getenv("MAX_FILE_SIZE", str(25 * 1024 * 1024)))
MAX_FILES_PER_BOT = int(os.getenv("MAX_FILES_PER_BOT", "10"))

GEMINI_PRIMARY = os.getenv("GEMINI_PRIMARY", "gemini-3.6-flash")
GEMINI_FALLBACK = os.getenv("GEMINI_FALLBACK", "gemini-3.5-flash-lite")

TELEGRAM_TOKEN = os.getenv("TELEGRAM_TOKEN", "")
TELEGRAM_BOT_USERNAME = os.getenv("TELEGRAM_BOT_USERNAME", "")
