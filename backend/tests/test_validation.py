"""Tests for input validation and sanitization utilities."""
import pytest
from backend.validation import (
    sanitize_string,
    validate_sku_id,
    validate_discount_percentage,
    validate_positive_integer,
    validate_url,
    sanitize_cart_items,
    validate_correlation_id,
    sanitize_dict_input,
    DISCOUNTABLE_SKUS,
)


class TestSanitizeString:
    def test_basic_sanitization(self):
        result = sanitize_string("<script>alert('xss')</script>", max_length=100)
        # Script tags are removed but content inside may remain
        assert "<script>" not in result and "</script>" not in result
        # The content 'alert('xss')' may remain since we only remove specified chars

    def test_max_length_enforcement(self):
        long_string = "A" * 300
        result = sanitize_string(long_string, max_length=100)
        assert len(result) <= 100

    def test_non_string_input(self):
        result = sanitize_string(123)
        assert result == "123"


class TestValidateSkuId:
    def test_valid_sku(self):
        assert validate_sku_id("SKU_101") is True
        assert validate_sku_id("sku_102") is True  # Case insensitive
        assert validate_sku_id("SKU_AB") is True   # 2 chars
        assert validate_sku_id("sku_12345") is True # 5 chars

    def test_invalid_sku_format(self):
        assert validate_sku_id("abc") is False  # Too short, no SKU_
        assert validate_sku_id("sku") is False  # Too short after SKU_
        assert validate_sku_id("INVALID") is False  # No SKU_ prefix
        assert validate_sku_id("SKU_TOOLONG") is False  # Too long after SKU_
        assert validate_sku_id("") is False  # Empty

    def test_non_string_sku(self):
        assert validate_sku_id(123) is False
        assert validate_sku_id(None) is False


class TestValidateDiscountPercentage:
    def test_valid_discount(self):
        assert validate_discount_percentage(0) is True
        assert validate_discount_percentage(50) is True
        assert validate_discount_percentage(100) is True

    def test_invalid_discount(self):
        assert validate_discount_percentage(-10) is False
        assert validate_discount_percentage(110) is False
        assert validate_discount_percentage("invalid") is False
        assert validate_discount_percentage(None) is False


class TestValidatePositiveInteger:
    def test_valid_positive(self):
        assert validate_positive_integer(1) is True
        assert validate_positive_integer(100) is True
        assert validate_positive_integer(0, min_value=0) is True

    def test_invalid(self):
        assert validate_positive_integer(0, min_value=1) is False
        assert validate_positive_integer(-5) is False
        assert validate_positive_integer("invalid") is False
        assert validate_positive_integer(None) is False


class TestSanitizeCartItems:
    def test_sanitize_valid_cart(self):
        cart = [
            {"sku": "SKU_101", "quantity": 2},
            {"sku": "SKU_102", "quantity": 1},
        ]
        result = sanitize_cart_items(cart)
        assert len(result) == 2
        assert result[0]["sku"] == "SKU_101"
        assert result[0]["quantity"] == 2

    def test_sanitize_invalid_sku(self):
        cart = [
            {"sku": "<script>SKU_101</script>", "quantity": 2},
        ]
        result = sanitize_cart_items(cart)
        assert "<script>" not in result[0]["sku"]

    def test_sanitize_high_quantity(self):
        cart = [{"sku": "SKU_101", "quantity": 200}]
        result = sanitize_cart_items(cart)
        assert result[0]["quantity"] <= 100  # Capped at 100

    def test_sanitize_empty_list(self):
        result = sanitize_cart_items([])
        assert result == []


class TestValidateCorrelationId:
    def test_valid_correlation_id(self):
        assert validate_correlation_id("corr_12345") is True
        assert validate_correlation_id("abc-def_ghi") is True

    def test_invalid_correlation_id(self):
        assert validate_correlation_id("") is False
        assert validate_correlation_id("a" * 101) is False  # Too long
        assert validate_correlation_id(123) is False


class TestSanitizeDictInput:
    def test_sanitize_with_allowed_keys(self):
        data = {"name": "<test>", "price": 100, "hidden": "secret"}
        result = sanitize_dict_input(data, allowed_keys=["name", "price"])
        assert "name" in result
        assert "price" in result
        assert "hidden" not in result

    def test_sanitize_without_key_filter(self):
        data = {"name": "<test>", "price": 100}
        result = sanitize_dict_input(data)
        assert "name" in result
        assert "price" in result
        assert result["name"] == "test"  # Sanitized

    def test_sanitize_nested_dict(self):
        data = {
            "meta": {"nested": "<value>", "normal": 42},
            "visible": "ok",
        }
        result = sanitize_dict_input(data)
        assert "meta" in result
        assert result["meta"]["nested"] == "value"  # Sanitized
        assert result["meta"]["normal"] == 42
        assert result["visible"] == "ok"