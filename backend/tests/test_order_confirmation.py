import unittest

from app.main import order_is_confirmed


class OrderConfirmationTest(unittest.TestCase):
    def test_confirmed_order_requires_explicit_true(self):
        assert order_is_confirmed({"customer_confirmed": True}) is True
        assert order_is_confirmed({"customer_confirmed": False}) is False
        assert order_is_confirmed({"customer_confirmed": "true"}) is False
        assert order_is_confirmed(None) is False


if __name__ == "__main__":
    unittest.main()
