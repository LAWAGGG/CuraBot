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


if __name__ == "__main__":
    unittest.main()
