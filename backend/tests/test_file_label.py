import unittest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models import Base, UploadedFile

class FileLabelTest(unittest.TestCase):
    def test_label_nullable_default_none(self):
        engine = create_engine("sqlite:///:memory:")
        Base.metadata.create_all(engine)
        db = sessionmaker(bind=engine)()
        row = UploadedFile(bot_id=1, filename="a.jpg", file_path="/tmp/a.jpg", file_type=".jpg")
        db.add(row); db.commit(); db.refresh(row)
        assert row.label is None

    def test_label_settable(self):
        engine = create_engine("sqlite:///:memory:")
        Base.metadata.create_all(engine)
        db = sessionmaker(bind=engine)()
        row = UploadedFile(bot_id=1, filename="a.jpg", file_path="/tmp/a.jpg", file_type=".jpg", label="Baju Merah")
        db.add(row); db.commit(); db.refresh(row)
        assert row.label == "Baju Merah"
