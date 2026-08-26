from __future__ import annotations

import asyncio
import logging
from unittest.mock import AsyncMock

import httpx
import pytest
from pydantic import ValidationError

from enfinia_runtime.clients.v1 import TransactionServiceClientV1
from enfinia_runtime.contracts.v1 import TransactionCreateRequestV1


def test_transaction_request_rejects_invalid_boundary_data() -> None:
    with pytest.raises(ValidationError):
        TransactionCreateRequestV1.model_validate(
            {
                "userId": 0,
                "accountId": 7,
                "value": float("nan"),
                "description": "",
                "nature": "expense",
            }
        )


def test_transaction_request_requires_nature() -> None:
    with pytest.raises(ValidationError) as error:
        TransactionCreateRequestV1.model_validate(
            {
                "userId": 42,
                "accountId": 7,
                "value": 84.5,
                "description": "Mercado",
            }
        )

    assert error.value.errors()[0]["loc"] == ("nature",)


def test_transaction_client_serializes_and_validates_v1_contract() -> None:
    async def scenario() -> None:
        client = httpx.AsyncClient()
        response = httpx.Response(
            200,
            request=httpx.Request("POST", "http://transaction.test/transactions"),
            json={
                "success": True,
                "transacao": {
                    "id": 9,
                    "user_id": 42,
                    "account_id": 7,
                    "value": 84.5,
                    "description": "Mercado",
                    "nature": "debit",
                    "category": 5,
                    "categoriaTitulo": "Alimentação",
                    "source": "manual",
                    "idempotentReplay": False,
                },
            },
        )
        request = AsyncMock(return_value=response)
        client.request = request  # type: ignore[method-assign]
        service = TransactionServiceClientV1(
            client,
            base_url="http://transaction.test/",
            service_api_key="service-key",
            logger=logging.getLogger("test"),
        )

        try:
            result = await service.create_transaction(
                TransactionCreateRequestV1.model_validate(
                    {
                        "user_id": 42,
                        "account_id": 7,
                        "value": -84.5,
                        "description": "Mercado",
                        "nature": "debit",
                        "category_index": 5,
                    }
                )
            )
        finally:
            await client.aclose()

        assert result.transaction.id == 9
        call = request.await_args
        assert call is not None
        assert call.args[:2] == ("POST", "http://transaction.test/transactions")
        assert call.kwargs["json"] == {
            "userId": 42,
            "accountId": 7,
            "value": -84.5,
            "description": "Mercado",
            "nature": "debit",
            "source": "manual",
            "type": "outros",
            "categoryIndex": 5,
        }
        assert call.kwargs["headers"]["Authorization"] == "Bearer service-key"

    asyncio.run(scenario())
