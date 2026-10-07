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

    def test_no_marker(self):
        clean, files = parse_image_markers("halo kak")
        assert files == [] and clean == "halo kak"

    def test_whitespace_and_case(self):
        clean, files = parse_image_markers("[ IMG:  kolase menu.jpg ]")
        assert files == ["kolase menu.jpg"]
