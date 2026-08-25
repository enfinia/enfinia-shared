from __future__ import annotations

import asyncio
import logging
import time
from unittest.mock import AsyncMock

import httpx
import pytest

from enfinia_runtime import (
    DEFAULT_HTTP_TIMEOUT,
    correlation_scope,
    create_dependency_client,
    request_dependency,
    run_blocking,
)


def _response(status_code: int) -> httpx.Response:
    request = httpx.Request("GET", "http://service.test/resource")
    return httpx.Response(status_code, request=request)


def test_get_retries_502_and_preserves_correlation(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    async def scenario() -> None:
        async with create_dependency_client() as client:
            request = AsyncMock(side_effect=[_response(502), _response(200)])
            monkeypatch.setattr(client, "request", request)
            with correlation_scope("retry-id"):
                response = await request_dependency(
                    client,
                    "GET",
                    "http://service.test/resource",
                    logger=logging.getLogger("test"),
                )

            assert response.status_code == 200
            assert request.await_count == 2
            for call in request.await_args_list:
                assert call.kwargs["headers"]["X-Correlation-ID"] == "retry-id"

    asyncio.run(scenario())


def test_get_does_not_retry_terminal_503(monkeypatch: pytest.MonkeyPatch) -> None:
    async def scenario() -> None:
        async with create_dependency_client() as client:
            request = AsyncMock(return_value=_response(503))
            monkeypatch.setattr(client, "request", request)
            response = await request_dependency(
                client,
                "GET",
                "http://service.test/resource",
                logger=logging.getLogger("test"),
            )

            assert response.status_code == 503
            assert request.await_count == 1

    asyncio.run(scenario())


def test_post_does_not_retry_transport_failure(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    async def scenario() -> None:
        async with create_dependency_client() as client:
            request = AsyncMock(side_effect=httpx.ConnectError("unavailable"))
            monkeypatch.setattr(client, "request", request)
            with pytest.raises(httpx.ConnectError, match="unavailable"):
                await request_dependency(
                    client,
                    "POST",
                    "http://service.test/resource",
                    logger=logging.getLogger("test"),
                )
            assert request.await_count == 1

    asyncio.run(scenario())


def test_default_timeout_bounds_each_http_phase() -> None:
    assert DEFAULT_HTTP_TIMEOUT.connect == 3.0
    assert DEFAULT_HTTP_TIMEOUT.read == 30.0
    assert DEFAULT_HTTP_TIMEOUT.write == 10.0
    assert DEFAULT_HTTP_TIMEOUT.pool == 3.0

    client = create_dependency_client()
    try:
        assert client.timeout.connect == 3.0
        assert client.timeout.read == 30.0
        assert client.timeout.write == 10.0
        assert client.timeout.pool == 3.0
    finally:
        asyncio.run(client.aclose())


def test_blocking_operation_runs_off_event_loop() -> None:
    async def scenario() -> bool:
        event_loop_progressed = False

        def slow_operation() -> str:
            time.sleep(0.05)
            return "done"

        async def mark_progress() -> None:
            nonlocal event_loop_progressed
            await asyncio.sleep(0.01)
            event_loop_progressed = True

        marker = asyncio.create_task(mark_progress())
        result = await run_blocking(slow_operation)
        await marker
        return result == "done" and event_loop_progressed

    assert asyncio.run(scenario()) is True
