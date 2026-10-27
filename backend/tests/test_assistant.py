import io, json
import pytest
from fastapi.testclient import TestClient

from ev_assistant.api.main import app
from ev_assistant.config import settings
from ev_assistant.services import data_service, file_service, llm_service, pipeline, rag_service, tts_service
from ev_assistant.services.session_service import sessions

SID = "test-session-0001"
client = TestClient(app)


@pytest.fixture(autouse=True)
def _tmp(tmp_path, monkeypatch):
    for k in ("uploads_directory", "audio_directory", "sessions_directory", "datasets_directory", "documents_directory", "chroma_persist_directory"):
        monkeypatch.setattr(settings, k, tmp_path / k)
    settings.ensure_dirs()
    monkeypatch.setattr(rag_service, "retrieve", lambda *a, **k: [])
    sessions.delete(SID)


def events(r):
    return [json.loads(l[5:]) for l in r.text.splitlines() if l.startswith("data:")]


def fake_llm(tokens, delay=None):
    async def gen(q, ev, h):
        for t in tokens:
            yield t
    return gen


def test_health_reports_missing_model(monkeypatch):
    async def st(): return {"reachable": True, "model_present": False, "models": []}
    monkeypatch.setattr(llm_service, "ollama_status", st)
    j = client.get("/api/v1/assistant/health").json()
    assert j["status"] == "UNAVAILABLE" and j["components"]["llm_model"]["status"] == "UNAVAILABLE"


def test_chat_streams_tokens_and_unavailable_quality(monkeypatch):
    monkeypatch.setattr(llm_service, "stream_answer", fake_llm(["No ", "data."]))
    ev = events(client.post("/api/v1/assistant/chat", json={"session_id": SID, "input_type": "text", "text": "hello"}))
    assert [e["text"] for e in ev if e["event"] == "token"] == ["No ", "data."]
    src = next(e for e in ev if e["event"] == "source")
    assert src["data_quality"] == "UNAVAILABLE"          # nothing retrieved => labelled unavailable
    assert ev[-1]["event"] == "done"
    assert any(e["event"] == "audio_unavailable" for e in ev)


def test_ollama_down_emits_error(monkeypatch):
    async def st(): return {"reachable": False, "model_present": False, "models": []}
    monkeypatch.setattr(llm_service, "ollama_status", st)
    ev = events(client.post("/api/v1/assistant/chat", json={"session_id": SID, "input_type": "text", "text": "hi"}))
    assert ev[-1]["event"] == "error" and "Ollama" in ev[-1]["message"]


def test_structured_sample_is_labelled(tmp_path):
    (settings.datasets_directory / "d.csv").write_text(
        "district_name,state_name,priority_level,gap_score,ev_total,public_charging_points,evs_per_charger,coverage_score,additional_chargers_required,data_quality\n"
        "Lucknow,Uttar Pradesh,CRITICAL,82.4,48250,342,141.1,0.71,141,SAMPLE\n")
    import asyncio
    r = asyncio.run(data_service.query("Which district has the highest gap score?"))
    assert r.quality == "SAMPLE" and "Lucknow" in r.facts and r.sources == ["LOCAL_DATASET"]


def test_platform_disconnected_is_unavailable():
    import asyncio
    r = asyncio.run(data_service.query("highest gap score"))
    assert r.quality == "UNAVAILABLE"


def test_gap_score_formula():
    assert data_service.gap_score(1, 0, 1, 1) == 100.0
    with pytest.raises(ValueError):
        data_service.gap_score(2, 0, 0, 0)


def test_csv_upload_and_invalid_coords(monkeypatch):
    monkeypatch.setattr(llm_service, "stream_answer", fake_llm(["ok"]))
    csv = b"district,latitude,longitude,ev_total\nLucknow,26.8,80.9,10\nBad,99,10,5\n"
    r = client.post("/api/v1/assistant/file-query", data={"session_id": SID, "text": "invalid coordinates?"}, files={"file": ("a.csv", csv, "text/csv")})
    assert r.status_code == 200 and events(r)[-1]["event"] == "done"


def test_rejects_bad_extension_and_content():
    r = client.post("/api/v1/assistant/file-query", data={"session_id": SID}, files={"file": ("x.exe", b"MZ", "application/octet-stream")})
    assert r.status_code == 400
    r = client.post("/api/v1/assistant/file-query", data={"session_id": SID}, files={"file": ("x.pdf", b"not a pdf", "application/pdf")})
    assert r.status_code == 400


def test_geojson_and_json_parse(tmp_path):
    p = tmp_path / "t.json"; p.write_text(json.dumps([{"district": "A", "ev_total": 3}]))
    assert "Rows: 1" in file_service.parse(p, "t.json", SID).summary


def test_stop_idempotent_and_truthful():
    j1 = client.post("/api/v1/assistant/stop", json={"session_id": SID}).json()
    j2 = client.post("/api/v1/assistant/stop", json={"session_id": SID}).json()
    assert j1["stopped"] and j2["stopped"]
    assert j1["llm_stream_cancelled"] is False and j1["tts_generation_cancelled"] is False  # nothing was running


@pytest.mark.asyncio
async def test_exit_during_generation_cancels_stream(monkeypatch):
    import asyncio
    closed = {"v": False}

    async def slow(q, e, h):
        try:
            for i in range(1000):
                await asyncio.sleep(0.01)
                yield f"t{i} "
        finally:
            closed["v"] = True
    monkeypatch.setattr(llm_service, "stream_answer", slow)
    s = sessions.begin(SID)
    got = []

    async def consume():
        async for f in pipeline.answer(s, "hi"):
            got.append(json.loads(f[5:]))
    t = asyncio.create_task(consume())
    await asyncio.sleep(0.1)
    res = await sessions.stop(SID)
    await asyncio.wait_for(t, 2)
    assert res["llm_stream_cancelled"] is True
    assert got[-1]["event"] == "stopped" and closed["v"]
    assert not any(e["event"] in ("audio", "done") for e in got)   # nothing after stop


def test_audio_unknown_id_404_and_delete_session():
    assert client.get("/api/v1/assistant/audio/deadbeef").status_code == 404
    sessions.get(SID)
    assert client.get(f"/api/v1/assistant/session/{SID}").status_code == 200
    assert client.delete(f"/api/v1/assistant/session/{SID}").json()["deleted"] is True
    assert client.get(f"/api/v1/assistant/session/{SID}").status_code == 404


def test_tts_not_configured(monkeypatch):
    monkeypatch.setattr(settings, "tts_model_path", "")
    assert tts_service.readiness()[0] in ("NOT_CONFIGURED", "UNAVAILABLE")
