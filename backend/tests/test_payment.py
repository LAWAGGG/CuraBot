# backend/tests/test_payment.py
import unittest
from types import SimpleNamespace

from app import payment


def fake_bot(payment_info=None, qris=None, cash=False):
    return SimpleNamespace(payment_info=payment_info, qris_image_path=qris,
                           cash_enabled=cash)


def fake_order(**kw):
    base = dict(customer_name="Budi", customer_phone="0812",
                products=[{"product_name": "X"}], total_price=10000,
                delivery_address="Jl. A", status="pending", payment_proof_path=None)
    base.update(kw)
    return SimpleNamespace(**base)


class AvailableMethodsTest(unittest.TestCase):
    def test_all(self):
        assert payment.available_methods(fake_bot("BCA 123", "qris.jpg", True)) == \
            ["rekening", "qris", "cash"]

    def test_none(self):
        assert payment.available_methods(fake_bot()) == []

    def test_blank_payment_info_ignored(self):
        assert payment.available_methods(fake_bot("  \n ")) == []


class KeyboardTest(unittest.TestCase):
    def test_none_without_methods(self):
        assert payment.payment_keyboard(fake_bot()) is None

    def test_full_keyboard(self):
        assert payment.payment_keyboard(fake_bot("BCA 123", "qris.jpg", True)) == {
            "inline_keyboard": [
                [{"text": "Transfer / Rekening", "callback_data": "pay:rekening"}],
                [{"text": "QRIS", "callback_data": "pay:qris"}],
                [{"text": "Cash / Tunai", "callback_data": "pay:cash"}],
            ]
        }

    def test_partial_keyboard(self):
        kb = payment.payment_keyboard(fake_bot(qris="qris.jpg"))
        assert kb == {"inline_keyboard": [[{"text": "QRIS", "callback_data": "pay:qris"}]]}


class StageTest(unittest.TestCase):
    def test_active(self):
        assert payment.payment_stage_active(fake_bot("BCA 123"), fake_order()) is True

    def test_inactive_without_methods(self):
        assert payment.payment_stage_active(fake_bot(), fake_order()) is False

    def test_inactive_with_proof(self):
        assert payment.payment_stage_active(
            fake_bot("BCA 123"), fake_order(payment_proof_path="/p.jpg")) is False

    def test_inactive_incomplete_data(self):
        assert payment.payment_stage_active(
            fake_bot("BCA 123"), fake_order(customer_phone=None)) is False

    def test_inactive_status_confirmed(self):
        assert payment.payment_stage_active(
            fake_bot("BCA 123"), fake_order(status="confirmed")) is False

    def test_inactive_no_order(self):
        assert payment.payment_stage_active(fake_bot("BCA 123"), None) is False

    def test_onsite_address_counts_complete(self):
        assert payment.order_data_complete(fake_order(delivery_address="Onsite")) is True


class MentionsPaymentTest(unittest.TestCase):
    def test_keywords(self):
        assert payment.mentions_payment("jadi kalau mau bayar ada apa saja?") is True
        assert payment.mentions_payment("Minta no rekening dong") is True
        assert payment.mentions_payment("bisa COD?") is True
        assert payment.mentions_payment("ada QRIS?") is True

    def test_non_payment(self):
        assert payment.mentions_payment("pesan 2 kue coklat ya") is False
        assert payment.mentions_payment("") is False
        assert payment.mentions_payment(None) is False


class ReminderTextTest(unittest.TestCase):
    def test_contains_total_and_proof_ask(self):
        text = payment.reminder_text(fake_bot("BCA 123"), fake_order())
        assert "Rp10.000" in text
        assert "bukti pembayaran" in text

    def test_starts_with_prefix(self):
        # webhook dedupes reminder via prefix LIKE query — jangan ubah tanpa mengubah dedupe
        assert payment.reminder_text(fake_bot("BCA 123"), fake_order()).startswith(
            payment.REMINDER_PREFIX)


class CallbackResponseTest(unittest.TestCase):
    def test_rekening_quotes_verbatim(self):
        kind, text = payment.callback_response(fake_bot("BCA 123 a.n. Sari"), "pay:rekening")
        assert kind == "text"
        assert "BCA 123 a.n. Sari" in text
        assert "bukti pembayaran" in text

    def test_qris(self):
        kind, _ = payment.callback_response(fake_bot(qris="qris.jpg"), "pay:qris")
        assert kind == "qris"

    def test_cash(self):
        kind, text = payment.callback_response(fake_bot(cash=True), "pay:cash")
        assert kind == "text" and text == payment.CASH_TEXT

    def test_unavailable_method_falls_back(self):
        kind, text = payment.callback_response(fake_bot(), "pay:qris")
        assert kind == "text" and text == payment.NO_INFO_TEXT

    def test_garbage_data(self):
        kind, text = payment.callback_response(fake_bot("BCA"), "pay:bitcoin")
        assert kind == "text" and text == payment.NO_INFO_TEXT


class SlotHelperTest(unittest.TestCase):
    def test_service_options(self):
        assert payment.service_options("makan di tempat dan pengiriman online") == (True, True)
        assert payment.service_options("hanya ambil di toko") == (True, False)
        assert payment.service_options("kami hanya delivery online") == (False, True)
        assert payment.service_options("toko kue enak") == (True, True)

    def test_mentions_delivery(self):
        assert payment.mentions_delivery("pakai JNE ke rumah") is True
        assert payment.mentions_delivery("dikirim online ya") is True
        assert payment.mentions_delivery("ambil di toko") is False

    def test_user_asked_question(self):
        assert payment.user_asked_question("Harganya berapa?") is True
        assert payment.user_asked_question("berapa harganya") is True
        assert payment.user_asked_question("ambil di toko") is False
        assert payment.user_asked_question("iya sudah") is False


class CancelIntentTest(unittest.TestCase):
    def test_batal_words(self):
        assert payment.is_cancel_intent("batalkan pesanan saya") is True
        assert payment.is_cancel_intent("BATAL") is True
        assert payment.is_cancel_intent("cancel order please") is True
        assert payment.is_cancel_intent("mohon dibatalkan ya") is True

    def test_jadi_phrases(self):
        assert payment.is_cancel_intent("gak jadi deh") is True
        assert payment.is_cancel_intent("tidak jadi pesan") is True

    def test_non_cancel(self):
        assert payment.is_cancel_intent("pesan 2 kue coklat ya") is False
        assert payment.is_cancel_intent("tambah es teh satu") is False
        assert payment.is_cancel_intent("") is False


class ClassifyCancelReplyTest(unittest.TestCase):
    def test_confirm(self):
        assert payment.classify_cancel_reply("ya") == "confirm"
        assert payment.classify_cancel_reply("Iya betul") == "confirm"
        assert payment.classify_cancel_reply("ya, batalkan saja") == "confirm"
        assert payment.classify_cancel_reply("gak jadi") == "confirm"
        assert payment.classify_cancel_reply("cancel aja") == "confirm"

    def test_abort(self):
        assert payment.classify_cancel_reply("jangan") == "abort"
        assert payment.classify_cancel_reply("jangan batal") == "abort"
        assert payment.classify_cancel_reply("nggak") == "abort"
        assert payment.classify_cancel_reply("tidak") == "abort"

    def test_none(self):
        assert payment.classify_cancel_reply("ya, tambah es teh") == "none"
        assert payment.classify_cancel_reply("jam berapa buka?") == "none"
        assert payment.classify_cancel_reply("") == "none"

    def test_jangan_wins_over_batal(self):
        assert payment.classify_cancel_reply("jangan dibatalkan") == "abort"


if __name__ == "__main__":
    unittest.main()
