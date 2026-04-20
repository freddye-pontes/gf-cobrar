import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.routers import credores, devedores, dividas, negociacoes, repasses, dashboard, importar, admin, relatorios

# Docs only available in development
_is_dev = os.getenv("ENVIRONMENT", "production") == "development"

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    docs_url="/docs" if _is_dev else None,
    redoc_url="/redoc" if _is_dev else None,
    openapi_url="/openapi.json" if _is_dev else None,
    redirect_slashes=True,
)

# ── CORS ──────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────────────────────
prefix = settings.API_PREFIX

app.include_router(dashboard.router, prefix=prefix)
app.include_router(credores.router, prefix=prefix)
app.include_router(devedores.router, prefix=prefix)
app.include_router(dividas.router, prefix=prefix)
app.include_router(negociacoes.router, prefix=prefix)
app.include_router(repasses.router, prefix=prefix)
app.include_router(importar.router, prefix=prefix)
app.include_router(admin.router, prefix=prefix)
app.include_router(relatorios.router, prefix=prefix)


# ── Health check ──────────────────────────────────────────────────────────────
@app.get("/health", tags=["health"])
def health():
    return {"status": "ok", "app": settings.APP_NAME, "version": settings.APP_VERSION}


@app.get("/", tags=["health"])
def root():
    return {
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "docs": "/docs",
        "api": settings.API_PREFIX,
    }
