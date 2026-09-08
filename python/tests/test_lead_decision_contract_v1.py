"""Producer and consumer share a fail-closed, bounded confirmation contract."""
from __future__ import annotations

from typing import Any

import pytest

from enfinia_runtime.contracts.v1 import LeadDecisionResultV1


def payload(*, denied: bool = False, changed: bool = True) -> dict[str, Any]:
    return {"success": True, "changed": changed, "lead": {
        "hash_id": 10, "status": 2,
        "activation_denied_at": "2026-09-07T12:00:00Z" if denied else None,
    }}


@pytest.mark.parametrize("decision", ["accept_terms", "deny"])
@pytest.mark.parametrize("changed", [True, False])
def test_current_wire_shape_round_trips_without_database_extensions(decision: str, changed: bool) -> None:
    expected = payload(denied=decision == "deny", changed=changed)
    raw = {**expected, "internal": "private", "lead": {**expected["lead"], "contact": "synthetic", "name": "Synthetic Person"}}
    validated = LeadDecisionResultV1.validate_confirmation(raw, hash_id=10, decision=decision)
    assert validated.model_dump() == expected
    assert validated.changed is changed


@pytest.mark.parametrize("field,value", [("success", 1), ("success", False), ("changed", 1), ("changed", "false"), ("changed", None)])
def test_flags_are_strict(field: str, value: object) -> None:
    raw = payload()
    raw[field] = value
    with pytest.raises(ValueError):
        LeadDecisionResultV1.validate_confirmation(raw, hash_id=10, decision="accept_terms")


@pytest.mark.parametrize("field,value", [
    ("hash_id", 999), ("hash_id", True), ("hash_id", "10"), ("hash_id", 10.0),
    ("status", 1), ("status", "2"), ("status", True),
    ("activation_denied_at", "2026-09-07T12:00:00Z"),
    ("activation_denied_at", ""), ("activation_denied_at", "  "),
])
def test_acceptance_rejects_wrong_identity_state_or_denial(field: str, value: object) -> None:
    raw = payload()
    raw["lead"][field] = value
    with pytest.raises(ValueError):
        LeadDecisionResultV1.validate_confirmation(raw, hash_id=10, decision="accept_terms")


@pytest.mark.parametrize("marker", [None, "", "  ", True])
def test_denial_requires_explicit_marker(marker: object) -> None:
    raw = payload()
    raw["lead"]["activation_denied_at"] = marker
    with pytest.raises(ValueError):
        LeadDecisionResultV1.validate_confirmation(raw, hash_id=10, decision="deny")


@pytest.mark.parametrize("raw", [None, [], {}, {"success": True}, {"success": True, "changed": False, "lead": {"hash_id": 10, "status": 2}}])
def test_incomplete_results_are_not_confirmation(raw: object) -> None:
    with pytest.raises(ValueError):
        LeadDecisionResultV1.validate_confirmation(raw, hash_id=10, decision="accept_terms")


def test_request_context_cannot_be_missing_or_invalid() -> None:
    for hash_id, decision in [(0, "accept_terms"), (True, "accept_terms"), (10, "unknown")]:
        with pytest.raises(ValueError):
            LeadDecisionResultV1.validate_confirmation(payload(), hash_id=hash_id, decision=decision)
