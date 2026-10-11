import unittest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models import Base, Message
from app.main import (
    _inbound_quote,
    _strip_reply_ctx,
    _legacy_quote_split,
    _resolve_quote,
)


class InboundQuoteTest(unittest.TestCase):
    def test_none_when_no_reply(self):
        assert _inbound_quote({}) is None
        assert _inbound_quote({"reply_to_message": None}) is None

    def test_text_quote(self):
        m = {"reply_to_message": {"text": "halo boy"}, "chat": {"id": 1}}
        assert _inbound_quote(m) == "halo boy"

    def test_photo_quote_with_label(self):
        from app import main as mod
        mod._SENT_PHOTO_MSG[777] = "Katalog A"
        m = {"reply_to_message": {"message_id": 777, "photo": [{}], "caption": "ini apa?"},
             "chat": {"id": 1}}
        try:
            assert _inbound_quote(m) == "[foto: Katalog A] ini apa?"
        finally:
            mod._SENT_PHOTO_MSG.pop(777, None)

    def test_photo_quote_no_label(self):
        m = {"reply_to_message": {"message_id": 1, "photo": [{}]}, "chat": {"id": 1}}
        assert _inbound_quote(m) == "[foto]"


class StripCtxTest(unittest.TestCase):
    def test_strips_prefix(self):
        ctx = "[Customer membalas pesan: 'halo boy']"
        assert _strip_reply_ctx(f"{ctx} Napa boy", ctx) == "Napa boy"
        assert _strip_reply_ctx("Napa boy", ctx) == "Napa boy"
        assert _strip_reply_ctx(ctx, ctx) == ""
        assert _strip_reply_ctx("x", "") == "x"
        assert _strip_reply_ctx(None, ctx) == ""


class LegacySplitTest(unittest.TestCase):
    def test_text_variant(self):
        q, t = _legacy_quote_split("[Customer membalas pesan: 'halo boy'] Napa boy")
        assert q == "halo boy" and t == "Napa boy"

    def test_photo_variant(self):
        q, t = _legacy_quote_split(
            "[Customer membalas foto bot (file 'Katalog A'). Jawab dari nama file ini.] Kutipan: 'ini apa?'. Berapa?")
        assert q == "[foto: Katalog A] ini apa?" and t == "Berapa?"

    def test_clean_passthrough(self):
        assert _legacy_quote_split("Napa boy") == (None, "Napa boy")


class ResolveQuoteSuffixTest(unittest.TestCase):
    def setUp(self):
        engine = create_engine("sqlite:///:memory:")
        Base.metadata.create_all(engine)
        self.db = sessionmaker(bind=engine)()
        self.db.add(Message(bot_id=1, user_id="u", chat_id="c", sender="user",
                            message_text="hi", response_text="halo",
                            telegram_message_id=100, telegram_response_id=200))
        self.db.commit()

    def test_user_side_uses_inbound(self):
        tg, _ = _resolve_quote(self.db, 1, "u", "1-u")
        assert tg == 100

    def test_bot_side_uses_outbound(self):
        tg, _ = _resolve_quote(self.db, 1, "u", "1-b")
        assert tg == 200


if __name__ == "__main__":
    unittest.main()
