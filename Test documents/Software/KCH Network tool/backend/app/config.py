from pydantic_settings import BaseSettings
from pathlib import Path


class Settings(BaseSettings):
    # API Keys
    anthropic_api_key: str = ""
    openai_api_key: str = ""

    # JWT
    jwt_secret_key: str = "change-this-to-a-random-secret"
    jwt_algorithm: str = "HS256"
    jwt_expiration_hours: int = 24

    # Server
    backend_host: str = "0.0.0.0"
    backend_port: int = 8000
    cors_origins: str = "http://localhost:3000"

    # ChromaDB
    chroma_persist_dir: str = "./data/chroma"
    chroma_collection_name: str = "kch_documents"

    # Database
    database_url: str = "sqlite:///./data/kch.db"

    # Embedding
    embedding_model: str = "text-embedding-3-large"
    embedding_dimensions: int = 3072

    # LLM
    llm_model: str = "claude-sonnet-4-5-20250929"

    # Upload
    upload_dir: str = "./data/uploads"
    max_file_size_mb: int = 50

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",")]

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()

# Ensure data directories exist
for dir_path in [settings.chroma_persist_dir, settings.upload_dir]:
    Path(dir_path).mkdir(parents=True, exist_ok=True)
