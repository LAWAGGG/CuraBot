import unittest

from app.gemini_service import _is_custom_product, _products_known

KB_CUSTOM = "Toko Kue menerima pesanan custom cake dan kustom desain. Katalog: Red Velvet 50000."
KB_PLAIN = "Katalog: Red Velvet 50000. Black Forest 75000."


class CustomProductTest(unittest.TestCase):
    def test_custom_accepted_when_shop_offers_custom(self):
        prods = [{"product_name": 'Custom Cake "INAF"', "quantity": 100, "price": None}]
        assert _products_known(prods, KB_CUSTOM) is True

    def test_custom_rejected_when_shop_has_no_custom(self):
        prods = [{"product_name": "Custom Cake INAF", "quantity": 1, "price": None}]
        assert _products_known(prods, KB_PLAIN) is False

    def test_normal_products_unchanged(self):
        assert _products_known([{"product_name": "Red Velvet"}], KB_PLAIN) is True
        assert _products_known([{"product_name": "Kue Nuklir"}], KB_PLAIN) is False

    def test_empty_name_rejected(self):
        assert _products_known([{"product_name": ""}], KB_CUSTOM) is False

    def test_is_custom_product(self):
        assert _is_custom_product("Custom Cake X", KB_CUSTOM.lower()) is True
        assert _is_custom_product("Kue Lapis", KB_CUSTOM.lower()) is False
        assert _is_custom_product("Custom Cake X", KB_PLAIN.lower()) is False


if __name__ == "__main__":
    unittest.main()
