from __future__ import annotations

import logging

import httpx

from ...contracts.v1.transaction import (
    TransactionCreateRequestV1,
    TransactionCreateResponseV1,
)
from ...dependencies import request_dependency


class TransactionServiceClientV1:
    def __init__(
        self,
        client: httpx.AsyncClient,
        *,
        base_url: str,
        service_api_key: str,
        logger: logging.Logger,
    ) -> None:
        self._client = client
        self._base_url = base_url.rstrip("/")
        self._service_api_key = service_api_key
        self._logger = logger

    async def create_transaction(
        self,
        request: TransactionCreateRequestV1,
    ) -> TransactionCreateResponseV1:
        headers = {
            "Authorization": f"Bearer {self._service_api_key}",
            "Content-Type": "application/json",
        }
        response = await request_dependency(
            self._client,
            "POST",
            f"{self._base_url}/transactions",
            headers=headers,
            json=request.model_dump(
                by_alias=True,
                exclude_none=True,
                mode="json",
            ),
            logger=self._logger,
        )
        response.raise_for_status()
        return TransactionCreateResponseV1.model_validate(response.json())
