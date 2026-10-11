import unittest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models import Base, BotChat

class BotChatModeTest(unittest.TestCase):
    def test_botchat_mode_default_ai(self):
        engine = create_engine("sqlite:///:memory:")
        Base.metadata.create_all(engine)
        Session = sessionmaker(bind=engine)
        db = Session()
        row = BotChat(bot_id=1, chat_id="123")
        db.add(row)
        db.commit()
        db.refresh(row)
        assert row.mode == "ai"

from app.schemas import ModeIn

class ModeInTest(unittest.TestCase):
    def test_mode_in_validation(self):
        assert ModeIn(mode="ai").mode == "ai"
        assert ModeIn(mode="manual").mode == "manual"
        with self.assertRaises(Exception):
            ModeIn(mode="x")


from app.main import get_chat_mode, set_chat_mode

class ChatModeHelpersTest(unittest.TestCase):
    def setUp(self):
        engine = create_engine("sqlite:///:memory:")
        Base.metadata.create_all(engine)
        self.db = sessionmaker(bind=engine)()

    def test_get_defaults_to_ai(self):
        assert get_chat_mode(self.db, 1, "123") == "ai"

    def test_set_missing_creates_row(self):
        # chat_id unik global: set pada chat baru = buat baris, bukan None
        row = set_chat_mode(self.db, 1, "999", "manual")
        assert row is not None and row.mode == "manual" and row.bot_id == 1

    def test_set_rebinds_other_bot(self):
        # baris milik bot lain direbind, bukan insert ganda (anti IntegrityError 1062)
        self.db.add(BotChat(bot_id=1, chat_id="123"))
        self.db.commit()
        row = set_chat_mode(self.db, 2, "123", "manual")
        assert row is not None and row.bot_id == 2 and row.mode == "manual"
        assert self.db.query(BotChat).filter(BotChat.chat_id == "123").count() == 1

    def test_set_and_get(self):
        self.db.add(BotChat(bot_id=1, chat_id="123"))
        self.db.commit()
        row = set_chat_mode(self.db, 1, "123", "manual")
        assert row is not None and row.mode == "manual"
        assert get_chat_mode(self.db, 1, "123") == "manual"

    def test_chat_id_unique_per_botchat(self):
        self.db.add(BotChat(bot_id=1, chat_id="123"))
        self.db.commit()
        self.db.add(BotChat(bot_id=2, chat_id="123"))
        with self.assertRaises(Exception):
            self.db.commit()


if __name__ == "__main__":
    unittest.main()
