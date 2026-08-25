from __future__ import annotations

import contextvars
import uuid
from collections.abc import Iterator
from contextlib import contextmanager

from starlette.datastructures import Headers, MutableHeaders
from starlette.types import ASGIApp, Message, Receive, Scope, Send

CORRELATION_HEADER = "X-Correlation-ID"

_correlation_id: contextvars.ContextVar[str | None] = contextvars.ContextVar(
    "enfinia_correlation_id",
    default=None,
)


def current_correlation_id() -> str:
    """Return stable correlation ID for current request or background task."""
    correlation_id = _correlation_id.get()
    if correlation_id is None:
        correlation_id = str(uuid.uuid4())
        _correlation_id.set(correlation_id)
    return correlation_id


@contextmanager
def correlation_scope(value: str | None = None) -> Iterator[str]:
    """Bind one correlation ID for a request or background-work scope."""
    correlation_id = value.strip() if value and value.strip() else str(uuid.uuid4())
    token = _correlation_id.set(correlation_id)
    try:
        yield correlation_id
    finally:
        _correlation_id.reset(token)


class CorrelationIdMiddleware:
    """Propagate inbound correlation IDs and expose them on responses."""

    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        inbound = Headers(scope=scope).get(CORRELATION_HEADER)
        with correlation_scope(inbound) as correlation_id:
            async def send_with_correlation(message: Message) -> None:
                if message["type"] == "http.response.start":
                    headers = MutableHeaders(scope=message)
                    headers[CORRELATION_HEADER] = correlation_id
                await send(message)

            await self.app(scope, receive, send_with_correlation)
