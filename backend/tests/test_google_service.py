import unittest
from app import config


class GoogleConfigTest(unittest.TestCase):
    def test_google_settings_exist(self):
        assert hasattr(config, "GOOGLE_CREDENTIALS_PATH")
        assert hasattr(config, "GOOGLE_CLIENT_EMAIL")
        assert config.GOOGLE_SHEET_TTL == 60
        assert config.GOOGLE_DRIVE_TTL == 120


class GoogleModelsTest(unittest.TestCase):
    def test_models_exist(self):
        from app.models import BotExternalSource, ExtractedOrder
        assert BotExternalSource.__tablename__ == "bot_external_sources"
        assert hasattr(ExtractedOrder, "stock_deducted")


class GoogleParseTest(unittest.TestCase):
    def test_parse_sheet_id(self):
        from app import google_service
        sid = google_service.parse_google_id("sheet", "https://docs.google.com/spreadsheets/d/ABCdef123-_4567890/edit#gid=0")
        assert sid == "ABCdef123-_4567890"

    def test_parse_folder_id(self):
        from app import google_service
        fid = google_service.parse_google_id("drive_folder", "https://drive.google.com/drive/folders/1AbCdefGhIjKlmNoP12?usp=sharing")
        assert fid == "1AbCdefGhIjKlmNoP12"

    def test_reject_bad_host(self):
        from app import google_service
        try:
            google_service.parse_google_id("sheet", "https://evil.com/spreadsheets/d/ABCdef123-_4567890/edit")
            assert False, "harus ditolak"
        except ValueError:
            pass

    def test_guess_mapping(self):
        from app import google_service
        m = google_service.guess_mapping(["Nama Produk", "Harga Rp", "Stok", "Foto"])
        assert (m["name_col"], m["price_col"], m["stock_col"]) == (0, 1, 2)

    def test_fuzzy(self):
        from app import google_service
        hit = google_service.fuzzy_find("baju merah", ["Baju Merah Lengan Panjang.jpg", "celana.png"])
        assert hit == "Baju Merah Lengan Panjang.jpg"
        assert google_service.fuzzy_find("kulkas 2 pintu", ["baju.jpg"]) is None


class SourceDictTest(unittest.TestCase):
    def test_source_to_dict_shape(self):
        from app.main import source_to_dict
        from types import SimpleNamespace
        s = SimpleNamespace(id=1, bot_id=2, kind="sheet", url="https://docs.google.com/spreadsheets/d/ABCdef123-_4567890/edit",
                            external_id="ABCdef123-_4567890", tab=None, mapping={"name_col": 0}, last_error=None, created_at="now")
        d = source_to_dict(s)
        assert d["kind"] == "sheet" and d["external_id"] == "ABCdef123-_4567890" and d["id"] == 1
