"""
BharatGreen AI — FastAPI Application Entry Point
=================================================
Run in development:
    uvicorn main:app --reload --port 8000

Interactive docs available at:
    http://localhost:8000/docs   (Swagger UI)
    http://localhost:8000/redoc  (ReDoc)
"""

from __future__ import annotations
import os
import logging
from contextlib import asynccontextmanager
from typing import AsyncIterator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

# Load .env before anything else
load_dotenv()

from routers.workloads import router as workloads_router
from routers.regions import router as regions_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
)
logger = logging.getLogger("bharatgreen")


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    logger.info("BharatGreen AI backend starting up…")
    logger.info(
        "NVIDIA Nemotron model: %s",
        os.getenv("NVIDIA_MODEL", "nvidia/llama-3.1-nemotron-70b-instruct"),
    )
    yield
    logger.info("BharatGreen AI backend shutting down.")


app = FastAPI(
    title="BharatGreen AI",
    description=(
        "Intelligent agent for tracking and reducing carbon & water footprints "
        "of AI workloads across multi-cloud environments.\n\n"
        "Powered by **NVIDIA Nemotron** for agentic analysis and recommendations."
    ),
    version="1.0.0",
    contact={
        "name": "BharatGreen AI Team",
        "url": "https://github.com/your-org/bharatgreen-ai",
    },
    license_info={"name": "MIT"},
    lifespan=lifespan,
)

# ── CORS ─────────────────────────────────────────────────────────────────────
_cors_origins_raw = os.getenv("CORS_ORIGINS", "*")
_cors_origins = (
    ["*"] if _cors_origins_raw.strip() == "*"
    else [o.strip() for o in _cors_origins_raw.split(",")]
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(workloads_router, prefix="/api/v1")
app.include_router(regions_router, prefix="/api/v1")


# ── Health check ──────────────────────────────────────────────────────────────
@app.get("/health", tags=["Health"], summary="Health check")
async def health() -> dict:
    return {"status": "ok", "service": "BharatGreen AI"}


@app.get("/", tags=["Root"], include_in_schema=False)
async def root() -> dict:
    return {
        "message": "BharatGreen AI API",
        "docs": "/docs",
        "version": "1.0.0",
    }


# ── Local dev entry-point ─────────────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=int(os.environ.get("PORT", 8000)),
        reload=True,
    )
