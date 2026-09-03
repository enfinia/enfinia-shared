"""Shared reliability boundaries for Enfinia Python services."""

from .correlation import (
    CorrelationIdMiddleware,
    correlation_scope,
    current_correlation_id,
)
from .dependencies import (
    DEFAULT_HTTP_TIMEOUT,
    create_dependency_client,
    request_dependency,
    run_blocking,
)
from .errors import (
    FRAMEWORK_ERROR_CODES_V1,
    SHARED_ERROR_CODES_V1,
    SharedErrorCodeV1,
    is_shared_error_code_v1,
)

__all__ = [
    "CorrelationIdMiddleware",
    "DEFAULT_HTTP_TIMEOUT",
    "FRAMEWORK_ERROR_CODES_V1",
    "SHARED_ERROR_CODES_V1",
    "SharedErrorCodeV1",
    "correlation_scope",
    "create_dependency_client",
    "current_correlation_id",
    "is_shared_error_code_v1",
    "request_dependency",
    "run_blocking",
]
