import requests

BASE = "https://api.telegram.org"


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


def set_webhook(token: str, url: str):
    return _call(token, "setWebhook", url=url)


def delete_webhook(token: str):
    return _call(token, "deleteWebhook")


def send_message(token: str, chat_id, text: str):
    md = text.replace("**", "*")
    try:
        return _call(token, "sendMessage", chat_id=chat_id, text=md[:4000], parse_mode="Markdown")
    except ValueError:
        return _call(token, "sendMessage", chat_id=chat_id, text=text[:4000])
