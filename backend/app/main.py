from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.api.health import router as health_router
from app.api.chat_ai import router as chat_ai_router
from app.api.menu import router as menu_router
from app.api.nutrition import router as nutrition_router
from app.api.plate import router as plate_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan — startup and shutdown logic."""
    # Startup
    settings = get_settings()
    print(f"Starting {settings.app_name}...")
    yield
    # Shutdown
    print(f"Shutting down {settings.app_name}...")


app = FastAPI(
    title="NutriMess API",
    description="AI-powered mess nutrition tracker for IIT Roorkee",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS configuration
settings = get_settings()
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_origin_regex=settings.cors_origin_regex or None,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Route registration
app.include_router(health_router, prefix="/api", tags=["Health"])
app.include_router(menu_router, prefix="/api/menu", tags=["Menu"])
app.include_router(plate_router, prefix="/api/plate", tags=["Plate Analysis"])
app.include_router(nutrition_router, prefix="/api/nutrition", tags=["Nutrition"])
app.include_router(chat_ai_router, prefix="/api/chat", tags=["AI Chat"])
