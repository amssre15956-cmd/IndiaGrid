import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useAssistant } from './useAssistant'
import { AssistantStatusHeader } from './header'
import { ChatComposer, ChatMessage } from './components'
import { I } from './icons'
import './assistant.css'

const SUGGESTIONS = [
  'Which district in Uttar Pradesh has the highest Gap Score?',
  'Compare EVs per charging point across districts',
  'Estimate charging demand by 2029',
  'Identify underserved districts',
  'Find highway charging gaps',
  'Explain the Gap Score formula',
  'What data sources and methodology does this platform use?',
  'How do I analyze a district CSV?',
]
const OPEN_KEY = 'evx.open'

export default function AssistantPanel({ context }: { context?: 'scale' }) {
  const a = useAssistant()
  const [open, setOpen] = useState(() => localStorage.getItem(OPEN_KEY) === '1')
  const [settings, setSettings] = useState(false)
  const scroller = useRef<HTMLDivElement>(null)
  const pinned = useRef(true)
  const setOpenP = (v: boolean) => { setOpen(v); localStorage.setItem(OPEN_KEY, v ? '1' : '0') }

  useEffect(() => { if (open) void a.refreshHealth() }, [open, a.refreshHealth])
  // Follow new content only when the user is already at the bottom.
  useLayoutEffect(() => { const el = scroller.current; if (el && pinned.current) el.scrollTop = el.scrollHeight }, [a.messages])
  const onScroll = () => { const el = scroller.current; if (el) pinned.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40 }
  useEffect(() => {
    if (!open) return
    const k = (e: KeyboardEvent) => e.key === 'Escape' && setOpenP(false)
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [open])

  const chips = context === 'scale' ? ['How do I add a new CPO API adapter?', 'Which sources are currently using sample data?', 'Show data-quality issues for Uttar Pradesh.', 'What is required to scale this platform nationally?', 'How often is VAHAN data refreshed?'] : SUGGESTIONS

  return <div className="evx-root">
    {open && <section className="evx-panel" aria-label="EV Planning Assistant" role="dialog">
      <AssistantStatusHeader a={a} settings={settings} onSettings={() => setSettings((v) => !v)} onMinimize={() => setOpenP(false)} />
      <div className="evx-scroll" ref={scroller} onScroll={onScroll} aria-live="polite">
        {a.messages.length === 0 && <div className="evx-empty">
          <h3>Ask about India's EV charging network</h3>
          <p>Answers come only from your local models, indexed documents and connected datasets. Unavailable data is reported as unavailable.</p>
          {a.offline && <p className="evx-warn">The local backend is not reachable, so text questions use a clearly labelled demo mode with built-in sample content. Start the backend (see README) for full local-Llama answers, files and voice.</p>}
          <div className="evx-suggest">{chips.map((q) => <button key={q} onClick={() => a.send(q)} disabled={!a.canSend}>{q}</button>)}</div>
        </div>}
        {a.messages.map((m) => <ChatMessage key={m.id} m={m} autoPlay={a.autoPlayId === m.id} canRetry={a.canSend} onRetry={() => a.retryMsg(m.id)} />)}
        {a.stopped && <button className="evx-new" onClick={a.newSession}><I n="plus" s={15} />Start a new session</button>}
      </div>
      <ChatComposer canSend={a.canSend} busy={a.busy} stopped={a.stopped} pending={a.pending} recording={a.rec.on} recSeconds={a.rec.seconds} recError={a.rec.error}
        onSend={(t) => { pinned.current = true; a.send(t) }} onAttach={a.attach} onRemoveFile={() => a.setPending(null)} onMic={a.toggleRecording} onCancelRec={a.cancelRecording} />
    </section>}
    {!open && <div className="evx-launch-wrap">
      <span className="evx-hint" role="tooltip">EV Planning Assistant · offline, local Llama</span>
      <button className="evx-launch" onClick={() => setOpenP(true)} aria-label="Open EV Planning Assistant"><I n="chat" s={26} /></button>
    </div>}
  </div>
}
