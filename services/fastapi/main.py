import os
from typing import Annotated

from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel


class HealthResponse(BaseModel):
    status: str
    service: str
    api_version: str


class ServiceInfo(BaseModel):
    name: str
    api_version: str
    openapi: str


def create_app() -> FastAPI:
    app = FastAPI(
        title="ISK Lenses FastAPI Starter",
        description=(
            "A minimal, independently deployable FastAPI scaffold for future "
            "services. It does not replace or connect to the production Next.js API."
        ),
        version="1.0.0",
    )
    allowed_origins = [
        origin.strip()
        for origin in os.getenv("API_CORS_ORIGINS", "").split(",")
        if origin.strip()
    ]
    if allowed_origins:
        app.add_middleware(
            CORSMiddleware,
            allow_origins=allowed_origins,
            allow_credentials=True,
            allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
            allow_headers=["Authorization", "Content-Type", "Idempotency-Key"],
        )

    @app.get("/health", response_model=HealthResponse, tags=["Operations"])
    async def health() -> HealthResponse:
        return HealthResponse(
            status="ok",
            service="isk-lenses-fastapi",
            api_version="1.0.0",
        )

    @app.get("/api/v1", response_model=ServiceInfo, tags=["API"])
    async def api_info() -> ServiceInfo:
        return ServiceInfo(
            name="ISK Lenses FastAPI starter",
            api_version="1.0.0",
            openapi="/openapi.json",
        )

    @app.get("/api/v1/example", tags=["API"])
    async def example(
        q: Annotated[str | None, Query(max_length=100)] = None,
    ) -> dict[str, str | None]:
        return {"message": "Replace this example with a service endpoint.", "q": q}

    return app


app = create_app()
