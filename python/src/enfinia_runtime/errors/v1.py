"""
Error codes more than one Enfinia service emits (ENF-63).

A code is the machine-readable half of an error response. Services return
``{"detail": <str>, "code": <str>}``; ``detail`` is English technical text for
logs, and the code is what a caller branches on. The Bot Gateway maps a code to
customer copy, so a code that two services emit must be spelled identically in
both — otherwise the gateway needs one branch per service and the copy drifts.

This module owns exactly those shared codes. A code only one service can emit
stays in that service's own ``errors`` module; adding it here would imply a
contract that does not exist.

Membership is decided by comparing the ``ERROR_CODES`` sets of every service, not
by intuition. As of ENF-63 those five services emit 140 distinct codes, 22 of which
are emitted by more than one — and those 22 are exactly the members below. Adding a
code here without a second emitter, or leaving a two-emitter code out, both break
the rule this module exists for.

Versioned like ``enfinia_runtime.categories``: v1 is append-only. Renaming or
removing a member is a breaking wire change and needs a v2.
"""

from __future__ import annotations

from enum import StrEnum


class SharedErrorCodeV1(StrEnum):
    """Codes that cross service boundaries.

    Members are grouped by why they are shared, not by HTTP status: the same code
    can carry a different status in different services (``account_id_required`` is
    always 400, but ``supabase_not_configured`` is 500 in one service and 503 in
    another). Callers branch on the code and use the status only to decide whether
    to retry.
    """

    # Framework-level: every service attaches these from its exception handlers, so
    # that no error response can leave without a code.
    INTERNAL_ERROR = "internal_error"
    METHOD_NOT_ALLOWED = "method_not_allowed"
    REQUEST_VALIDATION_FAILED = "request_validation_failed"
    ROUTE_NOT_FOUND = "route_not_found"

    # Service-to-service authentication, identical in every service.
    SERVICE_API_KEY_NOT_CONFIGURED = "service_api_key_not_configured"
    UNAUTHORIZED = "unauthorized"

    # Infrastructure a service needs before it can answer at all.
    SUPABASE_NOT_CONFIGURED = "supabase_not_configured"

    # The conversational AI is unreachable. Responses carrying this code also carry
    # a customer-facing "message"; the Bot Gateway branches on the code.
    AI_UNAVAILABLE = "ai_unavailable"

    # Identifiers every service validates at its boundary.
    ACCOUNT_ID_REQUIRED = "account_id_required"
    HASH_ID_INVALID = "hash_id_invalid"
    HASH_ID_REQUIRED = "hash_id_required"
    USER_ID_REQUIRED = "user_id_required"

    # Payload fields validated in more than one service.
    ANSWER_REQUIRED = "answer_required"
    DESCRIPTION_REQUIRED = "description_required"
    IMAGE_REQUIRED = "image_required"
    NATURE_INVALID = "nature_invalid"
    VALUE_INVALID = "value_invalid"
    VALUE_REQUIRED = "value_required"

    # Records looked up by more than one service.
    ACCOUNT_NOT_FOUND = "account_not_found"
    ACTIVE_GOAL_NOT_FOUND = "active_goal_not_found"
    LEAD_NOT_FOUND = "lead_not_found"

    # Lead activation, which identity-service performs and backoffice triggers.
    ACTIVATION_FAILED = "activation_failed"


SHARED_ERROR_CODES_V1: frozenset[str] = frozenset(code.value for code in SharedErrorCodeV1)

# Codes every service attaches from its framework exception handlers. A service
# that registers those handlers must register all four, or some responses stay
# uncoded.
FRAMEWORK_ERROR_CODES_V1: frozenset[str] = frozenset(
    {
        SharedErrorCodeV1.INTERNAL_ERROR,
        SharedErrorCodeV1.METHOD_NOT_ALLOWED,
        SharedErrorCodeV1.REQUEST_VALIDATION_FAILED,
        SharedErrorCodeV1.ROUTE_NOT_FOUND,
    }
)


def is_shared_error_code_v1(code: str) -> bool:
    """True when ``code`` is part of the shared contract rather than service-local."""
    return code in SHARED_ERROR_CODES_V1
