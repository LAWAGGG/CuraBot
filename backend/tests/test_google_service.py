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


class DriveClassifyTest(unittest.TestCase):
    def test_image(self):
        from app import google_service
        assert google_service.classify_mime("image/jpeg", "foto.jpg") == "image"

    def test_video_mime(self):
        from app import google_service
        assert google_service.classify_mime("video/mp4", "klip.mp4") == "video"

    def test_video_ext_fallback(self):
        from app import google_service
        assert google_service.classify_mime("application/octet-stream", "klip.mov") == "video"

    def test_google_docs(self):
        from app import google_service
        assert google_service.classify_mime("application/vnd.google-apps.document", "Menu") == "doc"
        assert google_service.classify_mime("application/vnd.google-apps.presentation", "Deck") == "doc"
        assert google_service.classify_mime("application/vnd.google-apps.spreadsheet", "Harga") == "doc"

    def test_binary_docs(self):
        from app import google_service
        assert google_service.classify_mime("application/pdf", "katalog.pdf") == "doc"
        assert google_service.classify_mime("application/octet-stream", "nota.txt") == "doc"
        assert google_service.classify_mime("", "harga.csv") == "doc"

    def test_unsupported(self):
        from app import google_service
        # ponytail: folder/shortcut/zip di dalam folder Drive diabaikan (flat, tanpa rekursi)
        assert google_service.classify_mime("application/vnd.google-apps.folder", "Sub") == "unsupported"
        assert google_service.classify_mime("application/vnd.google-apps.shortcut", "Link") == "unsupported"
        assert google_service.classify_mime("application/zip", "arsip.zip") == "unsupported"
        assert google_service.classify_mime("", "tanpa-ekstensi") == "unsupported"

    def test_drive_summary_no_io(self):
        import time
        from types import SimpleNamespace
        from app import google_service
        src = SimpleNamespace(id=999991, external_id="unused")
        google_service._drive_cache[src.id] = (time.time(), [
            {"id": "a1b2c3d4e5", "name": "baju.jpg", "mime": "image/jpeg"},
            {"id": "b1b2c3d4e5", "name": "Menu", "mime": "application/vnd.google-apps.document"},
            {"id": "c1b2c3d4e5", "name": "katalog.pdf", "mime": "application/pdf"},
            {"id": "d1b2c3d4e5", "name": "klip.mp4", "mime": "video/mp4"},
            {"id": "e1b2c3d4e5", "name": "arsip.zip", "mime": "application/zip"},
        ])
        try:
            s = google_service.drive_summary(src)
            assert (s["images"], s["docs"], s["videos"], s["unsupported"]) == (1, 2, 1, 1)
            assert s["preview"] == ["baju.jpg"]
            assert s["preview_videos"] == ["klip.mp4"]
        finally:
            google_service._drive_cache.pop(src.id, None)

    def test_export_rejects_non_google_without_io(self):
        from app import google_service
        try:
            google_service.export_drive_text("ABCdef123-_4567890", "image/jpeg")
            assert False, "harus ditolak"
        except ValueError:
            pass
        try:
            google_service.download_drive_file("x")
            assert False, "harus ditolak"
        except ValueError:
            pass

    def test_extract_txt(self):
        from app import google_service
        assert google_service.extract_drive_text("nota.txt", "text/plain", b"harga 10rb") == "harga 10rb"
        assert google_service.extract_drive_text("a.csv", "text/csv", b"nama,harga\nbaju,50000") == "nama,harga\nbaju,50000"
        assert google_service.extract_drive_text("x.pdf", "application/pdf", b"") == ""


class SourceDictTest(unittest.TestCase):
    def test_source_to_dict_shape(self):
        from app.main import source_to_dict
        from types import SimpleNamespace
        s = SimpleNamespace(id=1, bot_id=2, kind="sheet", url="https://docs.google.com/spreadsheets/d/ABCdef123-_4567890/edit",
                            external_id="ABCdef123-_4567890", tab=None, mapping={"name_col": 0}, last_error=None, created_at="now")
        d = source_to_dict(s)
        assert d["kind"] == "sheet" and d["external_id"] == "ABCdef123-_4567890" and d["id"] == 1
