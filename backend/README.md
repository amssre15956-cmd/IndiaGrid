# EV Planning Assistant: offline local AI backend

FastAPI + LangChain Community + Ollama (Llama) + ChromaDB + sentence-transformers + faster-whisper + Piper.
The React panel lives in `src/assistant/` and is mounted by `src/Chatbot.tsx` (bottom-right launcher).

## Status
- Frontend: built and type-checked. Backend: written and syntax-checked; **its tests have not been executed yet** (no Python packages could be installed in the authoring environment). Run `pytest` after setup.
- Streaming design: **Server-Sent Events over POST responses** (one mechanism). The `WS /stream` endpoint from the spec is intentionally not implemented to avoid two streaming paths.
- Not implemented: highway-geometry connector, Ollama vision-model image understanding (images use Tesseract OCR only), Coqui TTS (Piper only), sample platform-API schema beyond `GET {PLATFORM_API_URL}/districts`.

## Setup (internet needed only for these install/download steps)
```bash
ollama pull llama3.1:8b            # or llama3.2:3b; set OLLAMA_MODEL
cd backend && python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# Pre-download the embedding and Whisper models once, then set HF_OFFLINE=true
python -c "from sentence_transformers import SentenceTransformer as S; S('sentence-transformers/all-MiniLM-L6-v2')"
python -c "from faster_whisper import WhisperModel as W; W('small')"
# Piper: download a voice (e.g. en_IN) .onnx + .onnx.json, then set TTS_MODEL_PATH in .env. Install Tesseract for OCR.
python ingest.py                   # index data/documents into ChromaDB
uvicorn ev_assistant.api.main:app --reload
```
Frontend: `pnpm dev` (or `npm run dev`). Set `VITE_ASSISTANT_API` if the backend is not at `http://127.0.0.1:8000`.

## Data
- `data/documents/`: methodology docs (md, txt, pdf) indexed by `ingest.py`.
- `data/datasets/*.csv`: structured district data with the columns in `data_service.REQUIRED`; the bundled `sample_districts.csv` contains one SAMPLE row. Replace it or set `PLATFORM_API_URL`. With neither, answers are labelled `UNAVAILABLE`.
- The Gap Score formula is the example from the product brief and is labelled as unverified; compare it with the app's methodology before production use.

## Exit / cancellation
Exit aborts the browser request, stops recording and all audio immediately, bumps a generation id so late events are ignored, and calls `POST /stop`. The server sets the session cancel flag, closes the LLM stream, kills Piper and cancels in-flight transcription. Response flags are only `true` when something was actually cancelled; browser audio is reported `false` because the server cannot confirm it.

## Tests / offline check
`cd backend && pytest` (all model services are mocked; no network). Offline check: disconnect the network, set `HF_OFFLINE=true`, and confirm `GET /api/v1/assistant/health` is READY.

## Storage and retention
Uploads, audio, sessions and Chroma live under `data/`. `DELETE /api/v1/assistant/session/{id}` removes a session's history, uploads and audio (uploaded-PDF chunks stay in Chroma under that session id and are only retrievable by it).

## Troubleshooting
- Panel says "Backend offline": backend not running or origin not in `ALLOWED_ORIGINS`.
- "Model unavailable": `ollama serve`, then `ollama pull <OLLAMA_MODEL>`.
- No audio: health shows `text_to_speech` NOT_CONFIGURED until `TTS_MODEL_PATH` points to an installed Piper voice.
