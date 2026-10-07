import unittest
from app.image_markers import parse_image_markers

class ParseMarkersTest(unittest.TestCase):
    def test_single(self):
        clean, files = parse_image_markers("Ini dia [IMG: baju-a.jpg] ya")
        assert files == ["baju-a.jpg"]
        assert "[IMG:" not in clean

    def test_multiple_and_dedupe(self):
        clean, files = parse_image_markers("[IMG: a.jpg]\nlalu [IMG: b.jpg] dan [IMG: a.jpg]")
        assert files == ["a.jpg", "b.jpg"]
        assert "[IMG:" not in clean
        assert clean == "lalu  dan"

    def test_no_marker(self):
        clean, files = parse_image_markers("halo kak")
        assert files == [] and clean == "halo kak"

    def test_whitespace_and_case(self):
        clean, files = parse_image_markers("[ IMG:  kolase menu.jpg ]")
        assert files == ["kolase menu.jpg"]
        assert "[IMG:" not in clean

    def test_empty_string(self):
        assert parse_image_markers("") == ("", [])

    def test_none(self):
        assert parse_image_markers(None) == ("", [])

    def test_marker_without_filename(self):
        clean, files = parse_image_markers("[IMG: ]")
        assert files == []
        assert "[IMG:" in clean

    def test_blank_lines_collapse(self):
        clean, files = parse_image_markers("halo\n\n\n\nhalo")
        assert clean == "halo\n\nhalo"

    def test_crlf_normalization(self):
        clean, files = parse_image_markers("baris1\r\n\r\n\r\nbaris2 [IMG:\r\na.jpg]")
        assert "\r" not in clean
        assert "\n\n\n" not in clean
        assert files == ["a.jpg"]
