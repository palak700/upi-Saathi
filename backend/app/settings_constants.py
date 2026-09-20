"""Tiny constants module so the fraud engine can use configured thresholds
without coupling to the full settings object."""

from .config import get_settings

_settings = get_settings()

HIGH_AMOUNT_THRESHOLD: float = _settings.high_amount_threshold