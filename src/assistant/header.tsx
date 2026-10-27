import { StatusBadge } from './components'
import { I } from './icons'
import type { useAssistant } from './useAssistant'

export function AssistantStatusHeader({ a, settings, onSettings, onMinimize }: { a: ReturnType<typeof useAssistant>; settings: boolean; onSettings: () => void; onMinimize: () => void }) {
  return <header className="evx-head">
    <div className="evx-head-top">
      <span className="evx-logo"><I n="chat" s={18} /></span>
      <div className="evx-title"><h2>EV Planning Assistant</h2><p>Offline · Local Llama AI</p></div>
      <button className="evx-icon" onClick={a.newSession} aria-label="New chat" title="New chat"><I n="plus" s={16} /></button>
      <button className="evx-icon" onClick={onSettings} aria-expanded={settings} aria-label="Audio settings" title="Audio settings"><I n="vol" s={16} /></button>
      <button className="evx-icon" onClick={onMinimize} aria-label="Minimize panel (does not stop the assistant)" title="Minimize panel (does not stop the assistant)"><I n="minus" s={16} /></button>
      <button className="evx-exit" onClick={a.exit} disabled={a.stopped} aria-label="Exit: stop all assistant processing" title="Stops generation, voice recording and audio"><I n="power" s={15} />Exit</button>
    </div>
    <div className="evx-head-sub"><StatusBadge health={a.health} offline={a.offline} /><span className="evx-sid" title="Session id">session {a.sessionId.slice(0, 8)}</span></div>
    {settings && <label className="evx-setting"><input type="checkbox" checked={a.autoplay} onChange={(e) => a.setAutoplay(e.target.checked)} />Auto-play audio of answers</label>}
  </header>
}
