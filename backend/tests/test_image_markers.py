import unittest
from app.image_markers import parse_image_markers, parse_media_markers, parse_video_markers

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
        clean, files = parse_image_markers("lihat ini [IMG: ] ya")
        assert files == []
        assert "[IMG:" not in clean
        assert clean == "lihat ini  ya"

    def test_blank_lines_collapse(self):
        clean, files = parse_image_markers("halo\n\n\n\nhalo")
        assert clean == "halo\n\nhalo"

    def test_crlf_normalization(self):
        clean, files = parse_image_markers("baris1\r\n\r\n\r\nbaris2 [IMG:\r\na.jpg]")
        assert "\r" not in clean
        assert "\n\n\n" not in clean
        assert files == ["a.jpg"]


class ParseVideoMarkersTest(unittest.TestCase):
    def test_single(self):
        clean, files = parse_video_markers("Ini videonya [VID: klip.mp4] ya")
        assert files == ["klip.mp4"]
        assert "[VID:" not in clean

    def test_multiple_and_dedupe(self):
        clean, files = parse_video_markers("[VID: a.mp4] lalu [VID: b.mp4] dan [VID: a.mp4]")
        assert files == ["a.mp4", "b.mp4"]
        assert "[VID:" not in clean

    def test_case_insensitive_and_empty(self):
        clean, files = parse_video_markers("lihat [vid: X.MP4] dan [VID: ] ya")
        assert files == ["X.MP4"]
        assert "[VID:" not in clean and "[vid:" not in clean

    def test_none(self):
        assert parse_video_markers(None) == ("", [])

    def test_img_parser_ignores_vid(self):
        clean, files = parse_image_markers("video [VID: a.mp4] dan foto [IMG: b.jpg]")
        assert files == ["b.jpg"]
        assert "[VID: a.mp4]" in clean

    def test_vid_parser_ignores_img(self):
        clean, files = parse_video_markers("video [VID: a.mp4] dan foto [IMG: b.jpg]")
        assert files == ["a.mp4"]
        assert "[IMG: b.jpg]" in clean

    def test_media_combined(self):
        clean, images, videos = parse_media_markers("foto [IMG: b.jpg] video [VID: a.mp4]")
        assert images == ["b.jpg"] and videos == ["a.mp4"]
        assert "[IMG:" not in clean and "[VID:" not in clean
