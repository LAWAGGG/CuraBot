# backend/src/app/payment.py
"""Metode pembayaran: deteksi, inline keyboard, teks deterministik."""

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


def order_data_complete(order) -> bool:
    if not order:
        return False
    return bool(order.customer_name and order.customer_phone
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
