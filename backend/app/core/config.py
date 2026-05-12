from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List
import json


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    DATABASE_URL: str = "postgresql://postgres:senha@localhost:5432/gf_cobrar"
    SECRET_KEY: str = "dev-secret-key-troque-em-producao"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480

    # CORS — pode ser string JSON ou lista
    CORS_ORIGINS: str = '["http://localhost:3000"]'

    APP_NAME: str = "GF Recebíveis API"
    APP_VERSION: str = "1.0.0"
    API_PREFIX: str = "/api/v1"
    ENVIRONMENT: str = "production"

    # Asaas
    ASAAS_API_KEY: str = "$aact_prod_000MzkwODA2MWY2OGM3MWRlMDU2NWM3MzJlNzZmNGZhZGY6OjM3YmQzMDQ3LWM2NWUtNGQ3NC04MGIyLTUwNTQ1Zjc1ZWIzOTo6JGFhY2hfMTc3ZjM0NDktNjc0NS00NDQzLTk5NWQtNzU5YWJhY2ViYTEz"
    ASAAS_BASE_URL: str = "https://www.asaas.com/api/v3"
    ASAAS_WEBHOOK_TOKEN: str = ""
    BACKEND_PUBLIC_URL: str = "https://gf-cobrar.onrender.com"

    @property
    def cors_origins_list(self) -> List[str]:
        try:
            return json.loads(self.CORS_ORIGINS)
        except Exception:
            return [self.CORS_ORIGINS]


settings = Settings()
