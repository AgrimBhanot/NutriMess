from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # Supabase
    supabase_url: str = ""
    supabase_service_key: str = ""

    # Gemini AI
    gemini_api_key: str = ""

    # CORS
    cors_origins: str = "http://localhost:3000"

    # App
    app_name: str = "NutriMess API"
    debug: bool = False

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
    }

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",")]


@lru_cache()
def get_settings() -> Settings:
    return Settings()
