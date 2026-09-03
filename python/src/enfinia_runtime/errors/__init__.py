"""Versioned cross-service error code contracts."""

from .v1 import (
    FRAMEWORK_ERROR_CODES_V1,
    SHARED_ERROR_CODES_V1,
    SharedErrorCodeV1,
    is_shared_error_code_v1,
)

__all__ = [
    "FRAMEWORK_ERROR_CODES_V1",
    "SHARED_ERROR_CODES_V1",
    "SharedErrorCodeV1",
    "is_shared_error_code_v1",
]
