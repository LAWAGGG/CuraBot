import unittest

from app import location_service as loc


class EnrichTemplateTest(unittest.TestCase):
    def test_marker_becomes_single_block(self):
        out = loc.enrich_with_maps(
            "Silakan datang ke toko kami ya [[LOC: Jl ABC 123, Jakarta]]",
            "-6.25, 106.86")
        assert out == ("Silakan datang ke toko kami ya "
                       "📍Lokasi:\nJl ABC 123, Jakarta\nMaps: https://www.google.com/maps?q=-6.25,106.86"), out

    def test_address_written_once(self):
        out = loc.enrich_with_maps("[[LOC: Jl ABC 123]]", "1,2")
        assert out.count("Jl ABC 123") == 1, out
        assert out.count("https://www.google.com/maps?q=1,2") == 1, out

    def test_no_marker_unchanged(self):
        assert loc.enrich_with_maps("halo kak", "1,2") == "halo kak"

    def test_coords_spaces_stripped(self):
        out = loc.enrich_with_maps("[[LOC: X]]", "-6.25, 106.86")
        assert "q=-6.25,106.86" in out, out


if __name__ == "__main__":
    unittest.main()
