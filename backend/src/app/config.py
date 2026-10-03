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
ENCRYPTION_KEY = os.getenv("ENCRYPTION_KEY", "")

BASE_URL = os.getenv("BASE_URL", "http://localhost:8000").rstrip("/")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")

UPLOAD_DIR = os.getenv("UPLOAD_DIR", "uploads")
MAX_FILE_SIZE = int(os.getenv("MAX_FILE_SIZE", str(25 * 1024 * 1024)))
MAX_FILES_PER_BOT = int(os.getenv("MAX_FILES_PER_BOT", "10"))

GEMINI_PRIMARY = os.getenv("GEMINI_PRIMARY", "gemini-3.6-flash")
GEMINI_FALLBACK = os.getenv("GEMINI_FALLBACK", "gemini-3.5-flash-lite")

TELEGRAM_TOKEN = os.getenv("TELEGRAM_TOKEN", "")
TELEGRAM_BOT_USERNAME = os.getenv("TELEGRAM_BOT_USERNAME", "")
