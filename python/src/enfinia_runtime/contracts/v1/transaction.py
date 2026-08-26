from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import ConfigDict, Field, FiniteFloat

from .base import ContractModelV1

TransactionNatureV1 = Literal["credit", "debit"]


class TransactionCreateRequestV1(ContractModelV1):
    user_id: int = Field(gt=0, alias="userId")
    account_id: int = Field(gt=0, alias="accountId")
    value: FiniteFloat = Field(ge=-10_000_000, le=10_000_000)
    description: str = Field(min_length=1)
    nature: TransactionNatureV1 = "debit"
    flow: str | None = None
    category: str | None = None
    category_index: int | None = Field(
        default=None,
        gt=0,
        alias="categoryIndex",
    )
    subcategory: str | None = Field(default=None, max_length=100)
    source: str = Field(default="manual", min_length=1)
    transaction_type: str = Field(
        default="outros",
        alias="type",
        min_length=1,
    )
    counterparty: str | None = None
    identifier: str | None = Field(default=None, max_length=100)
    transacted_at: datetime | None = Field(
        default=None,
        alias="transactedAt",
    )
    installment_number: int | None = Field(
        default=None,
        gt=0,
        alias="installmentNumber",
    )
    installment_total: int | None = Field(
        default=None,
        gt=0,
        alias="installmentTotal",
    )


class TransactionRecordV1(ContractModelV1):
    model_config = ConfigDict(
        extra="allow",
        populate_by_name=True,
        str_strip_whitespace=True,
    )

    id: int = Field(gt=0)
    user_id: int = Field(gt=0)
    account_id: int = Field(gt=0)
    value: FiniteFloat
    description: str
    nature: TransactionNatureV1
    category: int | None = None
    category_title: str | None = Field(
        default=None,
        alias="categoriaTitulo",
    )
    subcategory: str | None = None
    essentiality: bool | None = None
    source: str
    identifier: str | None = None
    idempotent_replay: bool = Field(
        default=False,
        alias="idempotentReplay",
    )


class TransactionCreateResponseV1(ContractModelV1):
    success: Literal[True]
    transaction: TransactionRecordV1 = Field(
        alias="transacao",
    )
