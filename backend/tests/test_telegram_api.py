import unittest
from unittest import mock
from app import telegram_api


class SendMessageKeyboardTest(unittest.TestCase):
    def _ok(self, payload):
        resp = mock.Mock()
        resp.json.return_value = {"ok": True, "result": {"payload": payload}}
        return resp

    def test_reply_markup_forwarded(self):
        kb = {"inline_keyboard": [[{"text": "QRIS", "callback_data": "pay:qris"}]]}
        with mock.patch("app.telegram_api.requests.post",
                        side_effect=lambda url, **kw: self._ok(kw["json"])) as post:
            telegram_api.send_message("tok", 1, "halo", reply_markup=kb)
        assert post.call_args.kwargs["json"]["reply_markup"] == kb

    def test_no_markup_key_when_none(self):
        with mock.patch("app.telegram_api.requests.post",
                        side_effect=lambda url, **kw: self._ok(kw["json"])) as post:
            telegram_api.send_message("tok", 1, "halo")
        assert "reply_markup" not in post.call_args.kwargs["json"]

    def test_answer_callback_query(self):
        with mock.patch("app.telegram_api.requests.post",
                        side_effect=lambda url, **kw: self._ok(kw["json"])) as post:
            telegram_api.answer_callback_query("tok", "cbq123")
        assert post.call_args.args[0].endswith("/answerCallbackQuery")
        assert post.call_args.kwargs["json"]["callback_query_id"] == "cbq123"


if __name__ == "__main__":
    unittest.main()
