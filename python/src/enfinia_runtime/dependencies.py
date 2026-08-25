from __future__ import annotations

import asyncio
import logging
import time
from collections.abc import Callable, Mapping
from typing import Any, TypeVar
from urllib.parse import urlsplit

import httpx

from .correlation import CORRELATION_HEADER, current_correlation_id

T = TypeVar("T")

DEFAULT_HTTP_TIMEOUT = httpx.Timeout(
    connect=3.0,
    read=30.0,
    write=10.0,
    pool=3.0,
)
_IDEMPOTENT_METHODS = frozenset({"GET", "HEAD"})
_RETRYABLE_STATUSES = frozenset({502, 504})


async def run_blocking(operation: Callable[[], T]) -> T:
    """Run synchronous dependency work without blocking async event loop."""
    return await asyncio.to_thread(operation)


async def request_dependency(
    client: httpx.AsyncClient,
    method: str,
    url: str,
    *,
    logger: logging.Logger,
    headers: Mapping[str, str] | None = None,
    **kwargs: Any,
) -> httpx.Response:
    """Call HTTP dependency with correlation, telemetry, and safe retries."""
    method = method.upper()
    request_headers = dict(headers or {})
    request_headers.setdefault(CORRELATION_HEADER, current_correlation_id())
    correlation_id = request_headers[CORRELATION_HEADER]
    endpoint = urlsplit(url)
    max_attempts = 2 if method in _IDEMPOTENT_METHODS else 1
    attempt = 1

    while True:
        started = time.perf_counter()
        try:
            response = await client.request(
                method,
                url,
                headers=request_headers,
                **kwargs,
            )
            latency_ms = (time.perf_counter() - started) * 1000
            logger.info(
                "dependency_call method=%s dependency=%s path=%s status=%s "
                "latency_ms=%.1f attempt=%s correlation_id=%s",
                method,
                endpoint.netloc,
                endpoint.path,
                response.status_code,
                latency_ms,
                attempt,
                correlation_id,
            )
            should_retry = (
                response.status_code in _RETRYABLE_STATUSES
                and attempt < max_attempts
            )
            if not should_retry:
                return response
        except httpx.TransportError as error:
            latency_ms = (time.perf_counter() - started) * 1000
            logger.warning(
                "dependency_error method=%s dependency=%s path=%s error=%s "
                "latency_ms=%.1f attempt=%s correlation_id=%s",
                method,
                endpoint.netloc,
                endpoint.path,
                type(error).__name__,
                latency_ms,
                attempt,
                correlation_id,
            )
            if attempt >= max_attempts:
                raise

        await asyncio.sleep(0.05 * attempt)
        attempt += 1
