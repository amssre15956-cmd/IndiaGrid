"""Re-index local documents: python ingest.py"""
from ev_assistant.config import settings
from ev_assistant.services import rag_service

if __name__ == "__main__":
    settings.ensure_dirs()
    print(rag_service.ingest_directory())
