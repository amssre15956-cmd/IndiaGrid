import { useCallback, useEffect, useRef, useState } from 'react'
import { assistantApi, readEvents } from './api'
import { stopAllAudio } from './audioRegistry'
import { demoStream } from './demo'
import { ALLOWED_EXT, MAX_UPLOAD_MB } from './types'
import type { AssistantEvent, ChatMsg, Health, PendingFile } from './types'

const uid = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`)
const AUTOPLAY_KEY = 'evx.autoplay'

export function useAssistant() {
  const [sessionId, setSessionId] = useState(uid)
  const [stopped, setStopped] = useState(false)
  const [busy, setBusy] = useState(false)
  const [messages, setMessages] = useState<ChatMsg[]>([])
  const [health, setHealth] = useState<Health | null>(null)
  const [offline, setOffline] = useState(false)
  const [pending, setPending] = useState<PendingFile | null>(null)
  const [autoplay, setAutoplayState] = useState(() => localStorage.getItem(AUTOPLAY_KEY) === '1')
  const [autoPlayId, setAutoPlayId] = useState<string | null>(null)
  const [rec, setRec] = useState<{ on: boolean; seconds: number; error?: string }>({ on: false, seconds: 0 })

  // Generation id: every request captures it; Exit / new session bump it so late events are ignored.
  const gen = useRef(0)
  const ctrl = useRef<AbortController | null>(null)
  const offlineRef = useRef(false)
  const sid = useRef(sessionId)
  const autoplayRef = useRef(autoplay)
  const retry = useRef(new Map<string, () => void>())
  const recorder = useRef<{ mr: MediaRecorder; stream: MediaStream; chunks: Blob[]; timer: number; cancelled: boolean } | null>(null)
  sid.current = sessionId
  offlineRef.current = offline
  autoplayRef.current = autoplay

  const setAutoplay = (v: boolean) => { setAutoplayState(v); localStorage.setItem(AUTOPLAY_KEY, v ? '1' : '0') }

  const refreshHealth = useCallback(async () => {
    try { setHealth(await assistantApi.health()); setOffline(false) } catch { setHealth(null); setOffline(true) }
  }, [])

  const patch = (id: string, f: (m: ChatMsg) => ChatMsg) => setMessages((ms) => ms.map((m) => (m.id === id ? f(m) : m)))

  /** Runs one streamed request. `start` performs the fetch; events mutate the assistant message `aid`. */
  const run = useCallback(async (start: (signal: AbortSignal) => Promise<Response>, aid: string, userId?: string, demoQ?: string) => {
    const g = ++gen.current
    const c = new AbortController()
    ctrl.current?.abort()
    ctrl.current = c
    setBusy(true)
    const live = () => g === gen.current
    const apply = (ev: AssistantEvent) => {
      switch (ev.event) {
        case 'transcription': if (userId) patch(userId, (m) => ({ ...m, text: ev.text, status: 'done' })); break
        case 'token': patch(aid, (m) => ({ ...m, text: m.text + ev.text })); break
        case 'source': patch(aid, (m) => ({ ...m, sources: ev.sources, quality: ev.data_quality ?? m.quality, notes: ev.notes })); break
        case 'audio': patch(aid, (m) => ({ ...m, audioUrl: ev.audio_url })); if (autoplayRef.current) setAutoPlayId(aid); break
        case 'audio_unavailable': patch(aid, (m) => ({ ...m, audioError: ev.reason })); break
        case 'done': patch(aid, (m) => ({ ...m, status: 'done' })); break
        case 'stopped': patch(aid, (m) => ({ ...m, status: 'stopped' })); break
        case 'error': patch(aid, (m) => ({ ...m, status: 'error', text: m.text || ev.message, notes: [ev.message] })); break
      }
    }
    const playDemo = async (q: string) => {
      patch(aid, (m) => ({ ...m, text: '', status: 'streaming', notes: undefined }))
      for await (const ev of demoStream(q)) { if (!live()) return; apply(ev) }
    }
    try {
      if (demoQ && offlineRef.current) { await playDemo(demoQ); return }
      const res = await start(c.signal)
      if (!res.ok) {
        let msg = `The assistant could not process this request (HTTP ${res.status}).`
        try { const j = await res.json(); if (j?.detail) msg = typeof j.detail === 'string' ? j.detail : msg } catch { /* keep default */ }
        throw new Error(msg)
      }
      for await (const ev of readEvents(res)) { if (!live()) return; apply(ev) }
      if (live()) patch(aid, (m) => (m.status === 'streaming' ? { ...m, status: 'incomplete' } : m))
    } catch (e) {
      if (!live() || (e instanceof DOMException && e.name === 'AbortError')) return
      const offlineErr = e instanceof TypeError
      if (offlineErr) setOffline(true)
      if (offlineErr && demoQ) { await playDemo(demoQ); return }
      const msg = offlineErr ? 'Cannot reach the local assistant backend. Start it with `uvicorn ev_assistant.api.main:app` (see README), then retry.' : (e as Error).message
      patch(aid, (m) => ({ ...m, status: 'error', text: m.text, notes: [msg] }))
    } finally {
      if (live()) { setBusy(false); ctrl.current = null }
    }
  }, [])

  const add = (m: Partial<ChatMsg> & Pick<ChatMsg, 'role'>): ChatMsg => {
    const full: ChatMsg = { id: uid(), text: '', time: Date.now(), status: 'done', ...m }
    setMessages((ms) => [...ms, full])
    return full
  }

  const canSend = !busy && !stopped

  const send = useCallback((text: string) => {
    const q = text.trim()
    if (stopped || busy || (!q && !pending)) return
    const file = pending?.status === 'ready' ? pending.file : null
    const question = q || `Summarize and profile ${file?.name}`
    add({ role: 'user', text: question, attachment: file?.name })
    const a = add({ role: 'assistant', status: 'streaming' })
    const go = () => {
      patch(a.id, (m) => ({ ...m, status: 'streaming', text: '', notes: undefined }))
      return run((s) => (file ? assistantApi.fileQuery(sid.current, file, question, s) : assistantApi.chat(sid.current, question, s)), a.id, undefined, file ? undefined : question)
    }
    retry.current.set(a.id, go)
    setPending(null)
    void go()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stopped, busy, pending, run])

  const retryMsg = (id: string) => { if (!busy && !stopped) retry.current.get(id)?.() }

  /* ---------- attachments ---------- */
  const attach = (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
    if (!ALLOWED_EXT.includes(ext)) return setPending({ file, status: 'error', error: `Unsupported type .${ext}. Allowed: ${ALLOWED_EXT.join(', ')}` })
    if (file.size > MAX_UPLOAD_MB * 1024 * 1024) return setPending({ file, status: 'error', error: `File exceeds the ${MAX_UPLOAD_MB} MB limit.` })
    setPending({ file, status: 'ready' })
  }

  /* ---------- voice ---------- */
  const releaseMic = () => {
    const r = recorder.current
    if (!r) return
    window.clearInterval(r.timer)
    r.stream.getTracks().forEach((t) => t.stop())
    recorder.current = null
    setRec((s) => ({ ...s, on: false, seconds: 0 }))
  }
  const cancelRecording = useCallback(() => {
    const r = recorder.current
    if (!r) return
    r.cancelled = true
    if (r.mr.state !== 'inactive') r.mr.stop()
    releaseMic()
  }, [])
  const toggleRecording = async () => {
    if (stopped || busy) return
    const r = recorder.current
    if (r) { if (r.mr.state !== 'inactive') r.mr.stop(); return }
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') return setRec({ on: false, seconds: 0, error: 'Recording is not supported in this browser.' })
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mr = new MediaRecorder(stream)
      const state = { mr, stream, chunks: [] as Blob[], timer: 0, cancelled: false }
      mr.ondataavailable = (e) => e.data.size && state.chunks.push(e.data)
      mr.onstop = () => {
        const blob = new Blob(state.chunks, { type: mr.mimeType || 'audio/webm' })
        const cancelled = state.cancelled
        releaseMic()
        if (cancelled || !blob.size) return
        const u = add({ role: 'user', text: 'Transcribing voice question…', status: 'streaming' })
        const a = add({ role: 'assistant', status: 'streaming' })
        const go = () => run((s) => assistantApi.audioQuery(sid.current, blob, s), a.id, u.id)
        retry.current.set(a.id, go)
        void go()
      }
      state.timer = window.setInterval(() => setRec((s) => ({ ...s, seconds: s.seconds + 1 })), 1000)
      recorder.current = state
      mr.start()
      setRec({ on: true, seconds: 0 })
    } catch (e) {
      const denied = e instanceof DOMException && (e.name === 'NotAllowedError' || e.name === 'SecurityError')
      setRec({ on: false, seconds: 0, error: denied ? 'Microphone permission was denied. Allow access in the browser and try again.' : 'No usable recording device was found.' })
    }
  }

  /* ---------- Exit: immediate browser-side cancellation + concurrent backend stop ---------- */
  const exit = useCallback(() => {
    const id = sid.current
    setStopped(true)
    gen.current++                       // invalidate in-flight events
    ctrl.current?.abort(); ctrl.current = null
    cancelRecording()
    stopAllAudio()
    setAutoPlayId(null)
    setBusy(false)
    setPending(null)
    setMessages((ms) => ms.map((m) => (m.status === 'streaming' ? { ...m, status: 'stopped' } : m)))
    void assistantApi.stop(id)          // not awaited: browser work above is already done
    add({ role: 'system', text: 'Assistant stopped. Text and audio output terminated.' })
  }, [cancelRecording])

  const newSession = useCallback(() => {
    const old = sid.current
    gen.current++
    ctrl.current?.abort(); ctrl.current = null
    cancelRecording(); stopAllAudio()
    retry.current.clear()
    void assistantApi.deleteSession(old)
    setSessionId(uid()); setStopped(false); setBusy(false); setMessages([]); setPending(null); setAutoPlayId(null)
  }, [cancelRecording])

  useEffect(() => () => { gen.current++; ctrl.current?.abort(); cancelRecording(); stopAllAudio() }, [cancelRecording])

  return { sessionId, stopped, busy, canSend, messages, health, offline, refreshHealth, send, retryMsg, pending, setPending, attach, autoplay, setAutoplay, autoPlayId, rec, toggleRecording, cancelRecording, exit, newSession }
}
