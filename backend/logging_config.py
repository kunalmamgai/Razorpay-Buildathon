"""Structured logging with correlation IDs for observability."""
import json
import logging
import sys
import uuid
from contextvars import ContextVar
from datetime import datetime, timezone
from typing import Any, Dict, Optional


correlation_id_var: ContextVar[Optional[str]] = ContextVar("correlation_id", default=None)


def get_correlation_id() -> str:
    """Get or create a correlation ID for the current context.
    
    Returns:
        Correlation ID string
    """
    corr_id = correlation_id_var.get()
    if corr_id is None:
        corr_id = str(uuid.uuid4())[:8]
        correlation_id_var.set(corr_id)
    return corr_id


def set_correlation_id(corr_id: str) -> None:
    """Set a correlation ID for the current context.
    
    Args:
        corr_id: Correlation ID to set
    """
    correlation_id_var.set(corr_id)


class StructuredFormatter(logging.Formatter):
    """JSON formatter for structured logging."""

    def format(self, record: logging.LogRecord) -> str:
        log_data: Dict[str, Any] = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "correlation_id": get_correlation_id(),
        }

        # Add extra fields
        if hasattr(record, "extra_fields"):
            log_data.update(record.extra_fields)

        # Add exception info
        if record.exc_info:
            log_data["exception"] = self.formatException(record.exc_info)

        # Add source location
        log_data["source"] = {
            "file": record.filename,
            "line": record.lineno,
            "function": record.funcName,
        }

        return json.dumps(log_data, default=str)


class ColoredFormatter(logging.Formatter):
    """Colored formatter for development console output."""

    COLORS = {
        "DEBUG": "\033[36m",    # Cyan
        "INFO": "\033[32m",      # Green
        "WARNING": "\033[33m",  # Yellow
        "ERROR": "\033[31m",    # Red
        "CRITICAL": "\033[35m", # Magenta
    }
    RESET = "\033[0m"

    def format(self, record: logging.LogRecord) -> str:
        color = self.COLORS.get(record.levelname, "")
        corr_id = get_correlation_id()
        timestamp = datetime.now(timezone.utc).strftime("%H:%M:%S")
        
        return (
            f"{color}{timestamp}{self.RESET} "
            f"[{record.name}] "
            f"[{corr_id[:8]}] "
            f"{record.levelname:8} "
            f"{record.getMessage()}"
        )


def setup_logging(level: str = "INFO", json_format: bool = False) -> None:
    """Setup structured logging for the application.
    
    Args:
        level: Logging level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
        json_format: Use JSON format for production (True) or colored text for dev (False)
    """
    root_logger = logging.getLogger()
    root_logger.setLevel(getattr(logging, level.upper(), logging.INFO))
    
    # Remove existing handlers
    for handler in root_logger.handlers[:]:
        root_logger.removeHandler(handler)
    
    # Create console handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(getattr(logging, level.upper(), logging.INFO))
    
    if json_format:
        console_handler.setFormatter(StructuredFormatter())
    else:
        console_handler.setFormatter(ColoredFormatter())
    
    root_logger.addHandler(console_handler)


def get_logger(name: str) -> logging.Logger:
    """Get a logger instance.
    
    Args:
        name: Logger name (typically __name__)
        
    Returns:
        Logger instance
    """
    return logging.getLogger(name)


class LogContext:
    """Context manager for adding fields to log records."""

    def __init__(self, logger: logging.Logger, **kwargs: Any):
        self.logger = logger
        self.extra_fields = kwargs
        self._old_factory = None

    def __enter__(self) -> "LogContext":
        self._old_factory = logging.getLogRecordFactory()

        def record_factory(*args: Any, **kwargs: Any) -> logging.LogRecord:
            record = self._old_factory(*args, **kwargs)
            record.extra_fields = self.extra_fields
            return record

        logging.setLogRecordFactory(record_factory)
        return self

    def __exit__(self, *args: Any) -> None:
        logging.setLogRecordFactory(self._old_factory)
        self._old_factory = None
