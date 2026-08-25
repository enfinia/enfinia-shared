from __future__ import annotations

from starlette.applications import Starlette
from starlette.requests import Request
from starlette.responses import JSONResponse
from starlette.routing import Route
from starlette.testclient import TestClient

from enfinia_runtime import CorrelationIdMiddleware, current_correlation_id


async def _correlation_endpoint(_request: Request) -> JSONResponse:
    return JSONResponse({"correlationId": current_correlation_id()})


def _app() -> Starlette:
    app = Starlette(routes=[Route("/correlation", _correlation_endpoint)])
    app.add_middleware(CorrelationIdMiddleware)
    return app


def test_inbound_correlation_id_reaches_handler_and_response() -> None:
    response = TestClient(_app()).get(
        "/correlation",
        headers={"X-Correlation-ID": "inbound-id"},
    )

    assert response.status_code == 200
    assert response.json() == {"correlationId": "inbound-id"}
    assert response.headers["X-Correlation-ID"] == "inbound-id"


def test_generated_correlation_id_is_stable_for_request() -> None:
    response = TestClient(_app()).get("/correlation")

    generated = response.json()["correlationId"]
    assert generated
    assert response.headers["X-Correlation-ID"] == generated
