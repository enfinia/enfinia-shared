"""Bounded Customer decision confirmation consumed by Channel."""
from __future__ import annotations

from typing import Literal, Self

from pydantic import BaseModel, ConfigDict, Field, field_validator

LeadDecisionV1 = Literal["accept_terms", "deny"]


class LeadDecisionStateV1(BaseModel):
    """Only fields required to confirm a persisted lead decision."""

    model_config = ConfigDict(extra="ignore", strict=True)

    hash_id: int = Field(gt=0)
    status: int
    activation_denied_at: str | None = Field(min_length=1)

    @field_validator("activation_denied_at")
    @classmethod
    def denial_must_be_explicit(cls, value: str | None) -> str | None:
        if value is not None and not value.strip():
            raise ValueError("Denial marker must not be blank")
        return value


class LeadDecisionResultV1(BaseModel):
    """Validate wire shape, then bind confirmation to the requested command.

    Ignore database extensions on input and omit them on serialization. Both
    producer and consumer must call validate_confirmation with request context;
    shape validation alone cannot prove the requested transition happened.
    """

    model_config = ConfigDict(extra="ignore", strict=True)

    success: Literal[True]
    changed: bool
    lead: LeadDecisionStateV1

    @field_validator("success", mode="before")
    @classmethod
    def success_must_be_true(cls, value: object) -> object:
        if value is not True:
            raise ValueError("Decision result must confirm success")
        return value

    @classmethod
    def validate_confirmation(
        cls, payload: object, *, hash_id: int, decision: str,
    ) -> Self:
        if type(hash_id) is not int or hash_id <= 0:
            raise ValueError("Expected hash ID must be a positive integer")
        if decision not in {"accept_terms", "deny"}:
            raise ValueError("Unknown lead decision")
        result = cls.model_validate(payload)
        if result.lead.hash_id != hash_id:
            raise ValueError("Decision result belongs to another contact")
        if decision == "accept_terms":
            if result.lead.status != 2 or result.lead.activation_denied_at is not None:
                raise ValueError("Terms acceptance was not confirmed")
        elif result.lead.activation_denied_at is None:
            raise ValueError("Lead denial was not confirmed")
        return result
