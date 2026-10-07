import json

import io
import requests

BASE = "https://api.telegram.org"

MAX_SEND_BYTES = 1_500_000
MAX_SEND_SIDE = 1600


def _photo_bytes(photo_path: str) -> tuple:
    with open(photo_path, "rb") as f:
        raw = f.read()
    if len(raw) <= MAX_SEND_BYTES:
        return photo_path.rsplit(".", 1)[-1].lower(), raw
    from PIL import Image
    img = Image.open(io.BytesIO(raw))
    img.thumbnail((MAX_SEND_SIDE, MAX_SEND_SIDE))
    if img.mode in ("RGBA", "LA", "P"):
        img = img.convert("RGB")
    buf = io.BytesIO()
    img.save(buf, "JPEG", quality=85, optimize=True)
    return "jpg", buf.getvalue()


def _call(token: str, method: str, **kwargs):
    try:
        r = requests.post(f"{BASE}/bot{token}/{method}", json=kwargs, timeout=10)
        data = r.json()
        if not data.get("ok"):
            raise ValueError(data.get("description", "Telegram API error"))
        return data["result"]
    except requests.RequestException as e:
        raise ValueError(f"Telegram unreachable: {e}")


def get_me(token: str) -> dict:
    return _call(token, "getMe")


def set_webhook(token: str, url: str, secret_token: str | None = None):
    kwargs = {"url": url}
    if secret_token:
        kwargs["secret_token"] = secret_token
    return _call(token, "setWebhook", **kwargs)


def delete_webhook(token: str):
    return _call(token, "deleteWebhook")


def get_file(token: str, file_id: str) -> dict:
    return _call(token, "getFile", file_id=file_id)


def download_file(token: str, file_path: str) -> bytes:
    r = requests.get(f"https://api.telegram.org/file/bot{token}/{file_path}", timeout=20)
    r.raise_for_status()
    return r.content


def send_photo(token: str, chat_id, photo_path: str, caption: str = "",
               reply_markup: dict | None = None):
    ext, data = _photo_bytes(photo_path)
    form = {"chat_id": chat_id, "caption": caption[:1000]}
    if reply_markup:
        form["reply_markup"] = json.dumps(reply_markup)
    r = requests.post(
        f"{BASE}/bot{token}/sendPhoto",
        data=form,
        files={"photo": (f"photo.{ext}", data)},
        timeout=30,
    )
    data = r.json()
    if not data.get("ok"):
        raise ValueError(data.get("description", "Telegram API error"))
    return data["result"]


def send_media_group(token: str, chat_id, photo_paths: list, caption: str = ""):
    media = []
    files = {}
    for i, p in enumerate(photo_paths[:10]):
        name = f"file{i}"
        ext, data = _photo_bytes(p)
        files[name] = (f"photo.{ext}", data)
        media.append({"type": "photo", "media": f"attach://{name}",
                      **({"caption": caption[:1000]} if i == 0 and caption else {})})
    r = requests.post(
        f"{BASE}/bot{token}/sendMediaGroup",
        data={"chat_id": chat_id, "media": json.dumps(media)},
        files=files,
        timeout=60,
    )
    data = r.json()
    if not data.get("ok"):
        raise ValueError(data.get("description", "Telegram API error"))
    return data["result"]


def send_message(token: str, chat_id, text: str, reply_markup: dict | None = None):
    md = text.replace("**", "*")
    extra = {"reply_markup": reply_markup} if reply_markup else {}
    try:
        return _call(token, "sendMessage", chat_id=chat_id, text=md[:4000],
                     parse_mode="Markdown", **extra)
    except ValueError:
        return _call(token, "sendMessage", chat_id=chat_id, text=text[:4000], **extra)


def answer_callback_query(token: str, callback_query_id):
    return _call(token, "answerCallbackQuery", callback_query_id=callback_query_id)
