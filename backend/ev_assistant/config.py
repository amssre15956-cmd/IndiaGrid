from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_env: str = "development"
    app_host: str = "127.0.0.1"
    app_port: int = 8000
    allowed_origins: str = "http://localhost:5173,http://127.0.0.1:5173,http://localhost:8443"

    ollama_base_url: str = "http://127.0.0.1:11434"
    ollama_model: str = "llama3.1:8b"
    ollama_vision_model: str = "llava"

    embedding_model: str = "sentence-transformers/all-MiniLM-L6-v2"
    hf_offline: bool = False

    chroma_persist_directory: Path = Path("../data/chroma")
    documents_directory: Path = Path("../data/documents")
    datasets_directory: Path = Path("../data/datasets")
    uploads_directory: Path = Path("../data/uploads")
    audio_directory: Path = Path("../data/audio")
    sessions_directory: Path = Path("../data/sessions")

    whisper_model: str = "small"
    tts_engine: str = "piper"
    tts_model_path: str = ""
    tts_voice_path: str = ""

    platform_api_url: str = ""
    max_upload_size_mb: int = 25
    auto_play_audio: bool = False

    @property
    def origins(self) -> list[str]:
        return [o.strip() for o in self.allowed_origins.split(",") if o.strip()]

    def ensure_dirs(self) -> None:
        for p in (self.chroma_persist_directory, self.documents_directory, self.datasets_directory,
                  self.uploads_directory, self.audio_directory, self.sessions_directory):
            Path(p).mkdir(parents=True, exist_ok=True)


settings = Settings()
