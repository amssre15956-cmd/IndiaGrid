import { useEffect, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { Markdown } from './markdown'
import { I } from './icons'
import { registerAudio } from './audioRegistry'
import { resolveAudio } from './api'
import type { ChatMsg, Health, PendingFile, Quality, ServiceState } from './types'

const QUALITY_HELP: Record<Quality, string> = {
  OK: 'Computed successfully from the configured data. This does not mean the data is officially verified.',
  SAMPLE: 'Sample data, not official statistics.',
  SYNTHETIC: 'Synthetic data generated for demonstration. Not official statistics.',
  INCOMPLETE: 'Some required inputs were missing or the answer is partial.',
  UNAVAILABLE: 'The required data could not be retrieved or is not connected.',
}
export function QualityBadge({ q }: { q: Quality }) {
  return <span className={`evx-q q-${q}`} title={QUALITY_HELP[q]}>{q}</span>
}
export function SourceBadges({ sources }: { sources: string[] }) {
  return <span className="evx-sources">{sources.map((s) => <span key={s} className="evx-src">{s}</span>)}</span>
}

export function StatusBadge({ health, offline }: { health: Health | null; offline: boolean }) {
  const st: ServiceState | 'OFFLINE' = offline ? 'OFFLINE' : health?.status ?? 'DEGRADED'
  const label = offline ? 'Demo mode · backend offline' : st === 'READY' ? 'Local model ready' : st === 'DEGRADED' ? 'Partially ready' : st === 'UNAVAILABLE' ? 'Model unavailable' : 'Not configured'
  const detail = health ? Object.entries(health.components).map(([k, v]) => `${k}: ${v.status}${v.detail ? ` (${v.detail})` : ''}`).join('\n') : 'The FastAPI backend did not respond.'
  return <span className={`evx-status s-${st}`} title={detail}><i />{label}</span>
}

const fmt = (t: number) => { const s = Math.max(0, Math.floor(t || 0)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}` }

export function AudioPlayer({ url, autoPlay }: { url: string; autoPlay: boolean }) {
  const ref = useRef<HTMLAudioElement>(null)
  const [playing, setPlaying] = useState(false)
  const [t, setT] = useState(0)
  const [dur, setDur] = useState(0)
  const [vol, setVol] = useState(1)
  const [err, setErr] = useState(false)
  const src = resolveAudio(url)
  useEffect(() => (ref.current ? registerAudio(ref.current) : undefined), [])
  useEffect(() => { if (autoPlay) ref.current?.play().catch(() => undefined) }, [autoPlay])
  if (err) return <p className="evx-audio-err">Audio could not be loaded. The text answer is unaffected.</p>
  return <div className="evx-audio" role="group" aria-label="Answer audio">
    <audio ref={ref} src={src} preload="metadata" onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => setPlaying(false)} onTimeUpdate={(e) => setT(e.currentTarget.currentTime)} onLoadedMetadata={(e) => setDur(e.currentTarget.duration)} onError={() => setErr(true)} />
    <button onClick={() => (playing ? ref.current?.pause() : ref.current?.play().catch(() => setErr(true)))} aria-label={playing ? 'Pause answer audio' : 'Play answer audio'}><I n={playing ? 'pause' : 'play'} s={15} /></button>
    <input type="range" min={0} max={dur || 1} step={0.1} value={t} onChange={(e) => { if (ref.current) ref.current.currentTime = Number(e.target.value) }} aria-label="Seek" />
    <span className="evx-time">{fmt(t)} / {fmt(dur)}</span>
    <span className="evx-vol"><I n="vol" s={14} /><input type="range" min={0} max={1} step={0.05} value={vol} onChange={(e) => { const v = Number(e.target.value); setVol(v); if (ref.current) ref.current.volume = v }} aria-label="Volume" /></span>
    <a href={src} download aria-label="Download answer audio"><I n="download" s={15} /></a>
  </div>
}

export function ChatMessage({ m, autoPlay, onRetry, canRetry }: { m: ChatMsg; autoPlay: boolean; onRetry: () => void; canRetry: boolean }) {
  const [copied, setCopied] = useState(false)
  if (m.role === 'system') return <div className="evx-sys" role="status">{m.text}</div>
  const mine = m.role === 'user'
  return <div className={`evx-row ${mine ? 'me' : ''}`}>
    <div className={`evx-bubble ${mine ? 'me' : ''} st-${m.status}`}>
      {m.attachment && <span className="evx-att-tag"><I n="file" s={13} />{m.attachment}</span>}
      {mine ? <p>{m.text}</p> : m.text ? <Markdown text={m.text} /> : m.status === 'streaming' ? <span className="evx-typing" aria-label="Assistant is generating"><i /><i /><i /></span> : null}
      {m.status === 'streaming' && m.text && <span className="evx-caret" aria-hidden="true" />}
      {!mine && m.notes?.length && m.status === 'error' ? <p className="evx-err" role="alert">{m.notes[0]}</p> : null}
      {!mine && (m.status === 'incomplete') && <p className="evx-warn">Incomplete answer: the stream ended before completion.</p>}
      {!mine && m.status === 'stopped' && <p className="evx-warn">Stopped before completion.</p>}
      {!mine && (m.quality || m.sources?.length) && <div className="evx-meta">{m.quality && <QualityBadge q={m.quality} />}{m.sources?.length ? <SourceBadges sources={m.sources} /> : null}</div>}
      {!mine && m.notes?.length && m.status !== 'error' ? <ul className="evx-notes">{m.notes.map((n) => <li key={n}>{n}</li>)}</ul> : null}
      {!mine && m.audioUrl && <AudioPlayer url={m.audioUrl} autoPlay={autoPlay} />}
      {!mine && m.audioError && <p className="evx-audio-err">Audio unavailable: {m.audioError}</p>}
      {!mine && m.status !== 'streaming' && <div className="evx-actions">
        {m.text && m.status !== 'error' && <button onClick={() => { void navigator.clipboard?.writeText(m.text); setCopied(true); setTimeout(() => setCopied(false), 1400) }} aria-label="Copy answer"><I n="copy" s={14} />{copied ? 'Copied' : 'Copy'}</button>}
        {(m.status === 'error' || m.status === 'incomplete') && canRetry && <button onClick={onRetry}><I n="retry" s={14} />Retry</button>}
      </div>}
      <time>{new Date(m.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</time>
    </div>
  </div>
}

export function FileChip({ f, onRemove }: { f: PendingFile; onRemove: () => void }) {
  const ext = f.file.name.split('.').pop()?.toUpperCase()
  const size = f.file.size > 1048576 ? `${(f.file.size / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(f.file.size / 1024))} KB`
  return <div className={`evx-chip ${f.status}`}>
    <I n="file" s={16} />
    <div><b title={f.file.name}>{f.file.name}</b><small>{ext} · {size} · {f.status === 'ready' ? 'Ready to send' : f.error}</small></div>
    <button onClick={onRemove} aria-label={`Remove ${f.file.name}`}><I n="x" s={14} /></button>
  </div>
}

export function VoiceBar({ seconds, onStop, onCancel }: { seconds: number; onStop: () => void; onCancel: () => void }) {
  return <div className="evx-voice" role="status" aria-label="Recording">
    <span className="evx-rec-dot" /><b>Recording {fmt(seconds)}</b>
    <span className="evx-wave" aria-hidden="true">{Array.from({ length: 14 }, (_, i) => <i key={i} style={{ animationDelay: `${i * 0.07}s` }} />)}</span>
    <button onClick={onCancel}>Cancel</button><button className="go" onClick={onStop}>Send</button>
  </div>
}

export function ChatComposer(p: {
  canSend: boolean; busy: boolean; stopped: boolean; pending: PendingFile | null; recording: boolean; recSeconds: number; recError?: string
  onSend: (t: string) => void; onAttach: (f: File) => void; onRemoveFile: () => void; onMic: () => void; onCancelRec: () => void
}) {
  const [text, setText] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const disabled = !p.canSend
  const ready = !!text.trim() || p.pending?.status === 'ready'
  const submit = () => { if (!disabled && ready) { p.onSend(text); setText('') } }
  const key = (e: KeyboardEvent) => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); submit() } }
  return <div className="evx-composer">
    {p.pending && <FileChip f={p.pending} onRemove={p.onRemoveFile} />}
    {p.recError && <p className="evx-err" role="alert">{p.recError}</p>}
    {p.recording ? <VoiceBar seconds={p.recSeconds} onStop={p.onMic} onCancel={p.onCancelRec} /> : null}
    <div className="evx-input">
      <input ref={fileRef} type="file" hidden accept=".csv,.xlsx,.json,.geojson,.pdf,.png,.jpg,.jpeg" onChange={(e) => { const f = e.target.files?.[0]; if (f) p.onAttach(f); e.target.value = '' }} />
      <button onClick={() => fileRef.current?.click()} disabled={disabled} aria-label="Attach file (CSV, XLSX, JSON, GeoJSON, PDF, image; max 25 MB)" title="Attach file · CSV, XLSX, JSON, GeoJSON, PDF, PNG, JPG · max 25 MB"><I n="plus" /></button>
      <textarea value={text} onChange={(e) => setText(e.target.value)} onKeyDown={key} rows={1} disabled={p.stopped} maxLength={4000} aria-label="Ask the EV Planning Assistant" placeholder={p.stopped ? 'Assistant stopped. Start a new session.' : 'Ask about EVs, chargers, gaps, or an attached file…'} />
      <button className={p.recording ? 'rec' : ''} onClick={p.onMic} disabled={disabled && !p.recording} aria-pressed={p.recording} aria-label={p.recording ? 'Stop recording and send' : 'Record voice question'}><I n="mic" /></button>
      <button className="send" onClick={submit} disabled={disabled || !ready} aria-label="Send message"><I n="send" /></button>
    </div>
  </div>
}
