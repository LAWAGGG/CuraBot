import unittest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models import Base, Bot
from app.schemas import BotCreateIn, BotUpdateIn


def make_bot(db):
    bot = Bot(user_id=1, name="Toko", system_prompt="x" * 20,
              api_key_encrypted="enc", telegram_bot_name="bot", telegram_link="")
    db.add(bot)
    db.commit()
    db.refresh(bot)
    return bot


class CashEnabledModelTest(unittest.TestCase):
    def setUp(self):
        engine = create_engine("sqlite:///:memory:")
        Base.metadata.create_all(engine)
        self.db = sessionmaker(bind=engine)()

    def test_default_false(self):
        assert make_bot(self.db).cash_enabled is False

    def test_set_true(self):
        bot = make_bot(self.db)
        bot.cash_enabled = True
        self.db.commit()
        self.db.refresh(bot)
        assert bot.cash_enabled is True


class CashEnabledSchemaTest(unittest.TestCase):
    def test_create_in(self):
        body = BotCreateIn(name="Toko", system_prompt="x" * 20,
                           api_key="k" * 12, cash_enabled=True)
        assert body.cash_enabled is True

    def test_update_in_optional(self):
        assert BotUpdateIn().cash_enabled is None
        assert BotUpdateIn(cash_enabled=False).cash_enabled is False


if __name__ == "__main__":
    unittest.main()
