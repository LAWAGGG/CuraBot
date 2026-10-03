import bcrypt
import jwt
from datetime import datetime, timedelta, timezone
from cryptography.fernet import Fernet
from fastapi import Depends, HTTPException, Header
from . import config

_fernet = None


def _f():
    global _fernet
    if _fernet is None:
        if not config.ENCRYPTION_KEY:
            raise RuntimeError("ENCRYPTION_KEY not set in .env")
        _fernet = Fernet(config.ENCRYPTION_KEY.encode())
    return _fernet


def hash_password(pw: str) -> str:
    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt(rounds=10)).decode()


def verify_password(pw: str, hashed: str) -> bool:
    return bcrypt.checkpw(pw.encode(), hashed.encode())


def create_token(user_id: int) -> str:
    payload = {
        "sub": str(user_id),
        "exp": datetime.now(timezone.utc) + timedelta(days=config.JWT_EXPIRE_DAYS),
    }
    return jwt.encode(payload, config.JWT_SECRET, algorithm="HS256")


def decode_token(token: str) -> int:
    try:
        payload = jwt.decode(token, config.JWT_SECRET, algorithms=["HS256"])
        return int(payload["sub"])
    except (jwt.ExpiredSignatureError, jwt.InvalidTokenError, KeyError, ValueError):
        raise HTTPException(401, "Invalid or expired token")


def get_current_user(authorization: str = Header(default="")) -> int:
    if not authorization.startswith("Bearer "):
        raise HTTPException(401, "Authorization: Bearer <token> header required")
    return decode_token(authorization[7:])


def encrypt(plain: str) -> str:
    return _f().encrypt(plain.encode()).decode()


def decrypt(cipher: str) -> str:
    return _f().decrypt(cipher.encode()).decode()
