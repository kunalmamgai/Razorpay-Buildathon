"""Input validation and sanitization utilities."""
import re
from typing import Any, Dict, List, Optional
from urllib.parse import urlparse

from backend.config import DISCOUNTABLE_SKUS


def sanitize_string(value: str, max_length: int = 255) -> str:
    """Sanitize string input by removing dangerous characters and limiting length.
    
    Args:
        value: Input string to sanitize
        max_length: Maximum allowed length
        
    Returns:
        Sanitized string
    """
    if not isinstance(value, str):
        return str(value)[:max_length]
    
    # Remove potentially dangerous characters
    sanitized = re.sub(r'[<>{}()[\];\'\"`\\]', '', value)
    
    # Limit length
    return sanitized[:max_length]


def validate_sku_id(sku: str) -> bool:
    """Validate SKU ID format.
    
    Args:
        sku: SKU identifier to validate
        
    Returns:
        True if valid, False otherwise
    """
    if not isinstance(sku, str):
        return False
    
    # SKU should be in format SKU_NNN where NNN is 3 digits, or SKU_XX for 2 chars
    return bool(re.match(r'^SKU_[A-Z0-9]{2,5}$', sku.upper()))


def validate_discount_percentage(discount: Any) -> bool:
    """Validate discount percentage is in valid range.
    
    Args:
        discount: Discount percentage to validate
        
    Returns:
        True if valid, False otherwise
    """
    try:
        discount_int = int(discount)
        return 0 <= discount_int <= 100
    except (ValueError, TypeError):
        return False


def validate_positive_integer(value: Any, min_value: int = 1) -> bool:
    """Validate positive integer.
    
    Args:
        value: Value to validate
        min_value: Minimum allowed value
        
    Returns:
        True if valid, False otherwise
    """
    try:
        int_value = int(value)
        return int_value >= min_value
    except (ValueError, TypeError):
        return False


def validate_url(url: str) -> bool:
    """Validate URL format.
    
    Args:
        url: URL to validate
        
    Returns:
        True if valid, False otherwise
    """
    if not isinstance(url, str):
        return False
    
    try:
        result = urlparse(url)
        return all([result.scheme, result.netloc])
    except Exception:
        return False


def sanitize_cart_items(cart_items: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Sanitize cart items to prevent injection attacks.
    
    Args:
        cart_items: List of cart item dictionaries
        
    Returns:
        Sanitized cart items
    """
    sanitized_items = []
    
    for item in cart_items:
        if not isinstance(item, dict):
            continue
            
        sanitized_item = {}
        
        # Sanitize SKU
        if "sku" in item and isinstance(item["sku"], str):
            sanitized_item["sku"] = sanitize_string(item["sku"], max_length=20)
            
        # Validate quantity
        if "quantity" in item:
            try:
                quantity = int(item["quantity"])
                sanitized_item["quantity"] = max(1, min(quantity, 100))  # Limit quantity
            except (ValueError, TypeError):
                sanitized_item["quantity"] = 1
                
        sanitized_items.append(sanitized_item)
        
    return sanitized_items


def validate_correlation_id(correlation_id: str) -> bool:
    """Validate correlation ID format.
    
    Args:
        correlation_id: Correlation ID to validate
        
    Returns:
        True if valid, False otherwise
    """
    if not isinstance(correlation_id, str):
        return False
    
    # Allow alphanumeric, hyphens, underscores, reasonable length
    return bool(re.match(r'^[a-zA-Z0-9_-]{1,100}$', correlation_id))


def sanitize_dict_input(data: Dict[str, Any], allowed_keys: Optional[List[str]] = None) -> Dict[str, Any]:
    """Sanitize dictionary input by filtering allowed keys and sanitizing values.
    
    Args:
        data: Input dictionary
        allowed_keys: List of allowed keys (if None, all keys allowed but sanitized)
        
    Returns:
        Sanitized dictionary
    """
    if not isinstance(data, dict):
        return {}
        
    sanitized = {}
    
    for key, value in data.items():
        # Filter by allowed keys if specified
        if allowed_keys is not None and key not in allowed_keys:
            continue
            
        # Sanitize key
        safe_key = sanitize_string(str(key), max_length=50)
        
        # Sanitize value based on type
        if isinstance(value, str):
            sanitized[safe_key] = sanitize_string(value)
        elif isinstance(value, int):
            sanitized[safe_key] = value
        elif isinstance(value, float):
            sanitized[safe_key] = value
        elif isinstance(value, bool):
            sanitized[safe_key] = value
        elif isinstance(value, list):
            # Recursively sanitize list items
            sanitized[safe_key] = [
                sanitize_string(str(item)) if isinstance(item, str) else item
                for item in value
            ]
        elif isinstance(value, dict):
            # Recursively sanitize nested dict
            sanitized[safe_key] = sanitize_dict_input(value)
        else:
            # Convert to string and sanitize
            sanitized[safe_key] = sanitize_string(str(value))
            
    return sanitized