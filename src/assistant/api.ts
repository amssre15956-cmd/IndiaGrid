import type { AssistantEvent, Health } from './types'

export const API_BASE: string = ((import.meta as unknown as { env: Record<string, string | undefined> }).env.VITE_ASSISTANT_API ?? 'http://127.0.0.1:8000').replace(/\/$/, '')
const P = `${API_BASE}/api/v1/assistant`

export const resolveAudio = (url: string) => (url.startsWith('http') ? url : `${API_BASE}${url}`)

/** Parses a Server-Sent-Events body (`data: {json}` frames). Malformed frames are skipped. */
export async function* readEvents(res: Response): AsyncGenerator<AssistantEvent> {
  if (!res.body) throw new Error('The assistant returned an empty response stream.')
  const reader = res.body.getReader()
  const dec = new TextDecoder()
  let buf = ''
  try {
    for (;;) {
      const { value, done } = await reader.read()
      if (done) break
      buf += dec.decode(value, { stream: true })
      let i: number
      while ((i = buf.indexOf('\n\n')) >= 0) {
        const frame = buf.slice(0, i)
        buf = buf.slice(i + 2)
        const data = frame.split('\n').filter((l) => l.startsWith('data:')).map((l) => l.slice(5).trim()).join('')
        if (!data) continue
        try {
          const ev = JSON.parse(data)
          if (ev && typeof ev.event === 'string') yield ev as AssistantEvent
        } catch { /* malformed event ignored */ }
      }
    }
  } finally {
    reader.cancel().catch(() => undefined)
  }
}

const sse = { Accept: 'text/event-stream' }

export const assistantApi = {
  async health(signal?: AbortSignal): Promise<Health> {
    const r = await fetch(`${P}/health`, { signal })
    if (!r.ok) throw new Error(`Health check failed (${r.status})`)
    return r.json()
  },
  chat: (session_id: string, text: string, signal: AbortSignal) =>
    fetch(`${P}/chat`, { method: 'POST', signal, headers: { 'Content-Type': 'application/json', ...sse }, body: JSON.stringify({ session_id, input_type: 'text', text }) }),
  audioQuery(session_id: string, audio: Blob, signal: AbortSignal) {
    const f = new FormData()
    f.append('session_id', session_id)
    f.append('input_type', 'audio')
    f.append('audio_file', audio, 'question.webm')
    return fetch(`${P}/audio-query`, { method: 'POST', signal, headers: sse, body: f })
  },
  fileQuery(session_id: string, file: File, text: string, signal: AbortSignal) {
    const f = new FormData()
    f.append('session_id', session_id)
    f.append('text', text)
    f.append('file', file, file.name)
    return fetch(`${P}/file-query`, { method: 'POST', signal, headers: sse, body: f })
  },
  stop: (session_id: string) =>
    fetch(`${P}/stop`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ session_id }), keepalive: true }).then((r) => r.json()).catch(() => null),
  deleteSession: (session_id: string) => fetch(`${P}/session/${session_id}`, { method: 'DELETE' }).catch(() => null),
}
