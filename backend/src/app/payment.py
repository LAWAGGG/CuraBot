# backend/src/app/payment.py
"""Metode pembayaran: deteksi, inline keyboard, teks deterministik."""

import re

CASH_TEXT = ("Pembayaran tunai (cash): bayar langsung ke penjual atau kurir "
             "saat pesanan diterima ya.")

NO_INFO_TEXT = "Maaf, info pembayaran belum diisi penjual. Mohon tunggu ya."

PROOF_ASK = "Setelah membayar, kirim foto/screenshot bukti pembayaran di chat ini ya."

METHOD_LABELS = {
    "rekening": "Transfer / Rekening",
    "qris": "QRIS",
    "cash": "Cash / Tunai",
}

PAYMENT_KEYWORDS = ("bayar", "pembayaran", "payment", "qris", "transfer",
                    "rekening", "cash", "tunai", "cod")


def mentions_payment(text: str) -> bool:
    lowered = (text or "").lower()
    return any(kw in lowered for kw in PAYMENT_KEYWORDS)


def available_methods(bot) -> list:
    methods = []
    if (bot.payment_info or "").strip():
        methods.append("rekening")
    if bot.qris_image_path:
        methods.append("qris")
    if getattr(bot, "cash_enabled", False):
        methods.append("cash")
    return methods


def payment_keyboard(bot) -> dict | None:
    rows = [[{"text": METHOD_LABELS[m], "callback_data": f"pay:{m}"}]
            for m in available_methods(bot)]
    return {"inline_keyboard": rows} if rows else None


_ONSITE_WORDS = ("makan di tempat", "makan ditempat", "dine in", "dine-in",
                  "ambil di toko", "diambil di toko", "pickup", "pick up", "onsite")
_DELIVERY_WORDS = ("diantar", "pengiriman", "dikirim", "delivery", "online",
                   "ojek", "gojek", "grab", "kurir", "gosend")
_DELIVERY_HINTS = _DELIVERY_WORDS + ("antar", "kirim", "jne", "jnt", "pos", "paxel", "alamat", "rumah")


def service_options(knowledge: str) -> tuple:
    """-> (onsite, delivery). Tak jelas -> anggap keduanya ada."""
    kl = (knowledge or "").lower()
    onsite = any(w in kl for w in _ONSITE_WORDS)
    delivery = any(w in kl for w in _DELIVERY_WORDS)
    if not onsite and not delivery:
        return True, True
    return onsite, delivery


def mentions_delivery(text: str) -> bool:
    return any(w in (text or "").lower() for w in _DELIVERY_HINTS)


_QUESTION_START = ("apa", "berapa", "bagaimana", "gimana", "kapan", "dimana",
                   "di mana", "apakah", "adakah", "bisakah", "kenapa", "mengapa")


def user_asked_question(text: str) -> bool:
    lowered = (text or "").lower().strip()
    return "?" in lowered or lowered.startswith(_QUESTION_START)


def order_data_complete(order) -> bool:
    if not order:
        return False
    # ponytail: nama opsional (tak ditanya di alur slot) — HP + produk + total + alamat cukup
    return bool(order.customer_phone
                and (order.products or []) and order.total_price is not None
                and (order.delivery_address or "").strip())


def payment_stage_active(bot, order) -> bool:
    return bool(available_methods(bot) and order_data_complete(order)
                and order.status in ("pending", "incomplete")
                and not order.payment_proof_path)


REMINDER_PREFIX = "Data pesananmu sudah lengkap"


def reminder_text(bot, order) -> str:
    total_str = f"Rp{float(order.total_price):,.0f}".replace(",", ".")
    return (f"{REMINDER_PREFIX}, Kak. Total pembayaran: *{total_str}*.\n"
            "Silakan pilih metode pembayaran di bawah ini. " + PROOF_ASK)


def callback_response(bot, data: str) -> tuple:
    """-> (kind, text). kind 'qris' = caller kirim gambar QRIS dulu, lalu text."""
    method = data.removeprefix("pay:")
    if method == "qris" and bot.qris_image_path:
        return "qris", "Itu gambar QRIS resmi dari penjual di atas ya. " + PROOF_ASK
    if method == "cash" and getattr(bot, "cash_enabled", False):
        return "text", CASH_TEXT
    if method == "rekening" and (bot.payment_info or "").strip():
        return "text", bot.payment_info.strip() + "\n\n" + PROOF_ASK
    return "text", NO_INFO_TEXT


# --- pembatalan pesanan oleh customer (2 langkah: niat -> konfirmasi -> eksekusi) ---
# kalimat kunci konfirmasi; AI wajib menuliskannya persis agar backend mengenalinya
CANCEL_MARK = "mau dibatalkan"
CANCEL_ASK = "Apakah pesanan ini benar mau dibatalkan, Kak?"

_WHOLE_CANCEL_RE = re.compile(r"\b(gak|ga|nggak|enggak|tidak|tak|tdk)\s+jadi\b")

_CANCEL_AFFIRM = {"ya", "iya", "iy", "betul", "benar", "bener", "oke", "ok",
                  "okay", "jadi", "setuju", "baik", "sip", "deal", "yup",
                  "yep", "mau", "boleh", "lanjut", "yaudah"}
_CANCEL_NEG = {"nggak", "enggak", "tidak", "gak", "ga", "tak", "tida", "ogah"}


def is_cancel_intent(text: str) -> bool:
    """Niat membatalkan SELURUH pesanan? Salah-positif (batal 1 item) ditampung
    langkah konfirmasi, jadi bias ke True."""
    lowered = (text or "").lower()
    if "batal" in lowered or "cancel" in lowered:
        return True
    return bool(_WHOLE_CANCEL_RE.search(lowered))


def classify_cancel_reply(text: str) -> str:
    """Jawaban atas pertanyaan konfirmasi pembatalan -> 'confirm' | 'abort' | 'none'."""
    lowered = (text or "").lower()
    tokens = re.findall(r"[a-z]+", lowered)
    if not tokens:
        return "none"
    if "jangan" in tokens:
        return "abort"
    if "batal" in lowered or "cancel" in lowered:
        return "confirm"
    if all(t in _CANCEL_AFFIRM for t in tokens) and len(tokens) <= 6:
        return "confirm"
    if "jadi" in tokens and any(t in _CANCEL_NEG for t in tokens):
        # "gak jadi" di konteks ini = menegaskan batal (bukan menunda)
        return "confirm"
    if any(t in _CANCEL_NEG for t in tokens):
        return "abort"
    return "none"
