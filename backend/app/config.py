from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # Supabase
    supabase_url: str = ""
    supabase_anon_key: str = ""
    supabase_service_key: str = ""

    # Gemini AI
    gemini_api_key: str = ""
    gemini_model: str = "gemini-2.5-flash"

    # CORS
    cors_origins: str = "http://localhost:3000"

    # Uploads
    max_upload_mb: int = 10

    # App
    app_name: str = "NutriMess API"
    debug: bool = False

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "extra": "ignore",
    }

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",")]

    @property
    def supabase_api_key(self) -> str:
        """Key sent as `apikey` header; user JWTs still enforce RLS."""
        return self.supabase_anon_key or self.supabase_service_key


@lru_cache()
def get_settings() -> Settings:
    return Settings()
