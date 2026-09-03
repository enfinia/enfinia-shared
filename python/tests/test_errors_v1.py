import enfinia_runtime
from enfinia_runtime.errors.v1 import (
    FRAMEWORK_ERROR_CODES_V1,
    SHARED_ERROR_CODES_V1,
    SharedErrorCodeV1,
    is_shared_error_code_v1,
)


def test_shared_codes_are_lowercase_snake_case() -> None:
    """Services compare these against wire values, so the spelling is the contract."""
    for code in SharedErrorCodeV1:
        assert code.value == code.value.lower()
        assert code.value.replace("_", "").isalnum()
        assert not code.value.startswith("_")
        assert not code.value.endswith("_")


def test_member_names_match_their_values() -> None:
    """A mismatch would let a service import the right name and send the wrong code."""
    for code in SharedErrorCodeV1:
        assert code.name == code.value.upper()


def test_shared_code_set_matches_the_enum() -> None:
    assert SHARED_ERROR_CODES_V1 == {code.value for code in SharedErrorCodeV1}
    assert len(SHARED_ERROR_CODES_V1) == len(list(SharedErrorCodeV1))


def test_framework_codes_are_a_subset_of_the_shared_contract() -> None:
    assert FRAMEWORK_ERROR_CODES_V1 <= SHARED_ERROR_CODES_V1
    assert FRAMEWORK_ERROR_CODES_V1 == {
        "internal_error",
        "method_not_allowed",
        "request_validation_failed",
        "route_not_found",
    }


# The emitters of each shared code, as of ENF-63. Recorded so that a member losing
# its second emitter is visible in review rather than silently becoming dead weight,
# and so a reader can tell why a code is here at all.
_EMITTERS = {
    "account_id_required": {"plan", "summary", "transaction"},
    "account_not_found": {"identity", "plan"},
    "activation_failed": {"backoffice", "identity"},
    "active_goal_not_found": {"plan", "summary"},
    "ai_unavailable": {"summary", "transaction"},
    "answer_required": {"plan", "summary"},
    "description_required": {"summary", "transaction"},
    "hash_id_invalid": {"backoffice", "identity"},
    "hash_id_required": {"backoffice", "identity"},
    "image_required": {"summary", "transaction"},
    "internal_error": {"backoffice", "identity", "plan", "transaction"},
    "lead_not_found": {"backoffice", "identity"},
    "method_not_allowed": {"backoffice", "identity", "plan", "transaction"},
    "nature_invalid": {"plan", "transaction"},
    "request_validation_failed": {"backoffice", "identity", "plan", "transaction"},
    "route_not_found": {"backoffice", "identity", "plan", "transaction"},
    "service_api_key_not_configured": {
        "backoffice", "identity", "plan", "summary", "transaction",
    },
    "supabase_not_configured": {"backoffice", "identity", "plan", "transaction"},
    "unauthorized": {"identity", "plan", "summary", "transaction"},
    "user_id_required": {"plan", "transaction"},
    "value_invalid": {"plan", "transaction"},
    "value_required": {"plan", "summary"},
}


def test_every_member_is_recorded_with_its_emitters() -> None:
    """A member here must exist because two services emit it, not by intuition."""
    assert set(_EMITTERS) == SHARED_ERROR_CODES_V1


def test_no_member_has_a_single_emitter() -> None:
    """One emitter means the code is service-local and belongs in that service."""
    single = sorted(code for code, services in _EMITTERS.items() if len(services) < 2)
    assert not single, f"these have one emitter and should not be shared: {single}"


def test_membership_helper_rejects_service_local_codes() -> None:
    assert is_shared_error_code_v1("unauthorized") is True
    assert is_shared_error_code_v1(SharedErrorCodeV1.AI_UNAVAILABLE) is True
    # Owned by transaction-service alone; sharing it would imply a contract that
    # does not exist.
    assert is_shared_error_code_v1("transaction_not_found") is False
    assert is_shared_error_code_v1("") is False


def test_codes_interoperate_with_plain_strings() -> None:
    """Services store codes as str, so a member must behave as one everywhere.

    Compared through .value and str() rather than the member itself: mypy narrows a
    member to a Literal and rejects a direct == against a string literal, even though
    the runtime comparison is true.
    """
    assert isinstance(SharedErrorCodeV1.UNAUTHORIZED, str)
    assert SharedErrorCodeV1.UNAUTHORIZED.value == "unauthorized"
    assert f"{SharedErrorCodeV1.UNAUTHORIZED}" == "unauthorized"
    assert "unauthorized" in SHARED_ERROR_CODES_V1
    assert {"unauthorized"} <= SHARED_ERROR_CODES_V1


def test_contract_is_reachable_from_the_package_root() -> None:
    assert enfinia_runtime.SHARED_ERROR_CODES_V1 is SHARED_ERROR_CODES_V1
    assert enfinia_runtime.SharedErrorCodeV1 is SharedErrorCodeV1
