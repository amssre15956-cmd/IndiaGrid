import { useRef, useState } from 'react'
import { INDIA_OUTLINE } from './indiaShape'
import StateCoin from './StateCoin'

const COS = Math.cos((22 * Math.PI) / 180)
const LON0 = Math.min(...INDIA_OUTLINE.map((p) => p[0]))
const LON1 = Math.max(...INDIA_OUTLINE.map((p) => p[0]))
const LAT0 = Math.max(...INDIA_OUTLINE.map((p) => p[1]))
const LAT1 = Math.min(...INDIA_OUTLINE.map((p) => p[1]))
const W = (LON1 - LON0) * COS
const H = LAT0 - LAT1
const pctX = (lon: number) => (((lon - LON0) * COS) / W) * 100
const pctY = (lat: number) => ((LAT0 - lat) / H) * 100
const POLY = INDIA_OUTLINE.map(([lo, la]) => `${pctX(lo).toFixed(2)}% ${pctY(la).toFixed(2)}%`).join(',')
const CLIP = `polygon(${POLY})`
const POINTS = INDIA_OUTLINE.map(([lo, la]) => `${pctX(lo).toFixed(2)},${pctY(la).toFixed(2)}`).join(' ')
const LAYERS = 7
const RIPPLES = [
  { x: 30, y: 38, d: 0 }, { x: 30, y: 38, d: -4 }, { x: 30, y: 38, d: -8 },
  { x: 68, y: 52, d: -2 }, { x: 68, y: 52, d: -6 }, { x: 68, y: 52, d: -10 },
]

type City = { name: string; state: string; lon: number; lat: number; chargers: number; status: string; util: number; gap: number }
export const CITIES: City[] = [
  { name: 'Delhi NCR', state: 'Delhi', lon: 77.21, lat: 28.61, chargers: 6240, status: 'High', util: 71, gap: 12 },
  { name: 'Mumbai', state: 'Maharashtra', lon: 72.88, lat: 19.08, chargers: 4980, status: 'High', util: 68, gap: 15 },
  { name: 'Bengaluru', state: 'Karnataka', lon: 77.59, lat: 12.97, chargers: 5710, status: 'High', util: 74, gap: 9 },
  { name: 'Chennai', state: 'Tamil Nadu', lon: 80.27, lat: 13.08, chargers: 2860, status: 'Moderate', util: 62, gap: 18 },
  { name: 'Kolkata', state: 'West Bengal', lon: 88.36, lat: 22.57, chargers: 1240, status: 'Low', util: 54, gap: 41 },
  { name: 'Hyderabad', state: 'Telangana', lon: 78.49, lat: 17.39, chargers: 3320, status: 'Moderate', util: 66, gap: 20 },
  { name: 'Ahmedabad', state: 'Gujarat', lon: 72.57, lat: 23.02, chargers: 1980, status: 'Moderate', util: 58, gap: 26 },
  { name: 'Jaipur', state: 'Rajasthan', lon: 75.79, lat: 26.91, chargers: 1120, status: 'Low', util: 49, gap: 38 },
  { name: 'Lucknow', state: 'Uttar Pradesh', lon: 80.95, lat: 26.85, chargers: 980, status: 'Low', util: 46, gap: 47 },
  { name: 'Pune', state: 'Maharashtra', lon: 73.86, lat: 18.52, chargers: 2410, status: 'Moderate', util: 64, gap: 19 },
  { name: 'Guwahati', state: 'Assam', lon: 91.74, lat: 26.14, chargers: 310, status: 'Low', util: 38, gap: 63 },
  { name: 'Dehradun', state: 'Uttarakhand', lon: 78.03, lat: 30.32, chargers: 420, status: 'Low', util: 44, gap: 52 },
  { name: 'Bhubaneswar', state: 'Odisha', lon: 85.82, lat: 20.3, chargers: 540, status: 'Low', util: 47, gap: 49 },
  { name: 'Kochi', state: 'Kerala', lon: 76.27, lat: 9.93, chargers: 1460, status: 'Moderate', util: 60, gap: 24 },
]

const statusColor: Record<string, string> = { High: 'var(--green)', Moderate: 'var(--cyan)', Low: 'var(--violet)' }
const REST = { rx: 52, rz: -12 }

export default function IndiaMap() {
  const [tilt, setTilt] = useState(REST)
  const [dragging, setDragging] = useState(false)
  const [open, setOpen] = useState<City | null>(null)
  const last = useRef<{ x: number; y: number } | null>(null)
  const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v))

  const down = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('.pin')) return
    last.current = { x: e.clientX, y: e.clientY }
    setDragging(true)
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  const move = (e: React.PointerEvent) => {
    if (!last.current) return
    const dx = e.clientX - last.current.x
    const dy = e.clientY - last.current.y
    last.current = { x: e.clientX, y: e.clientY }
    setTilt((t) => ({ rx: clamp(t.rx - dy * 0.35, 20, 75), rz: clamp(t.rz + dx * 0.4, -70, 70) }))
  }
  const up = () => {
    last.current = null
    setDragging(false)
  }

  return (
    <div
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={up}
      onDoubleClick={() => setTilt(REST)}
      className={`stage relative mx-auto aspect-square w-full max-w-[640px] touch-none select-none ${dragging ? 'cursor-grabbing' : 'cursor-grab'}`}
    >
      <div
        className="plane absolute left-1/2 top-1/2 w-[78%] -translate-x-1/2 -translate-y-1/2"
        style={{ ['--rx' as string]: `${tilt.rx}deg`, ['--rz' as string]: `${tilt.rz}deg`, transition: dragging ? 'none' : undefined, aspectRatio: `${W} / ${H}` } as React.CSSProperties}
        role="group"
        aria-label="Interactive 3D map of India with charger hubs. Drag to rotate, double-click to reset."
      >
        <div className="floor absolute -inset-24" style={{ transform: 'translateZ(-6px)' }} />
        <div className="absolute inset-0 rounded-full" style={{ transform: 'translateZ(-4px) scale(1.1)', background: 'radial-gradient(closest-side, color-mix(in srgb, var(--green) 28%, transparent), transparent)' }} />
        {Array.from({ length: LAYERS }).map((_, i) => (
          <div key={i} className="pointer-events-none absolute inset-0" style={{ transform: `translateZ(${-(LAYERS - i) * 2.2}px)`, clipPath: CLIP, background: 'var(--map-side)' }} />
        ))}
        <div className="map-fill pointer-events-none absolute inset-0" style={{ clipPath: CLIP }}>
          <div className="map-flow" />
          {RIPPLES.map((r, i) => (
            <span key={i} className="map-ripple" style={{ left: r.x + '%', top: r.y + '%', animationDelay: r.d + 's' }} />
          ))}
          <div className="map-gloss" />
        </div>
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 h-full w-full overflow-visible" aria-hidden="true">
          <defs>
            <filter id="river" x="0" y="0" width="100%" height="100%">
              <feTurbulence type="fractalNoise" baseFrequency="0.008 0.014" numOctaves="2" seed="4" result="n">
                <animate attributeName="baseFrequency" dur="14s" values="0.008 0.014;0.012 0.009;0.008 0.014" repeatCount="indefinite" />
              </feTurbulence>
              <feDisplacementMap in="SourceGraphic" in2="n" scale="46" xChannelSelector="R" yChannelSelector="G" />
            </filter>
          </defs>
          <polygon points={POINTS} fill="none" stroke="var(--green)" strokeWidth="0.5" vectorEffect="non-scaling-stroke" style={{ filter: 'drop-shadow(0 0 4px var(--green))' }} />
        </svg>

        {CITIES.map((c) => (
          <span key={c.name + '-g'} aria-hidden="true" className="pointer-events-none absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full" style={{ left: pctX(c.lon) + '%', top: pctY(c.lat) + '%', background: statusColor[c.status], boxShadow: `0 0 10px ${statusColor[c.status]}` }} />
        ))}
        {CITIES.map((c) => (
          <button
            key={c.name}
            className="pin absolute -translate-x-1/2 -translate-y-full cursor-pointer"
            style={{ left: pctX(c.lon) + '%', top: pctY(c.lat) + '%', ['--c' as string]: statusColor[c.status] } as React.CSSProperties}
            aria-label={`${c.name}: ${c.chargers} chargers, ${c.status} availability. Open ${c.state} hologram`}
            onClick={() => setOpen(c)}
          >
            <span className="relative block h-5 w-5">
              <span className="pulse-ring absolute inset-0 rounded-full" style={{ background: 'var(--c)' }} />
              <span className="absolute inset-[5px] rounded-full ring-2 ring-white/80" style={{ background: 'var(--c)', boxShadow: '0 0 14px var(--c)' }} />
            </span>
            <span className="mx-auto block h-4 w-px" style={{ background: 'linear-gradient(var(--c), transparent)' }} />
            <span className="tip glass absolute bottom-[calc(100%+6px)] left-1/2 z-10 w-48 rounded-xl p-3 text-left" style={{ background: 'var(--surface-strong)' }}>
              <span className="mb-2 flex items-center justify-between font-display text-sm font-semibold text-ink">
                {c.name}
                <span className="rounded-full px-2 py-0.5 text-[10px]" style={{ background: 'color-mix(in srgb, var(--c) 22%, transparent)', color: 'var(--text)' }}>{c.status}</span>
              </span>
              {[
                ['Chargers', c.chargers.toLocaleString('en-IN')],
                ['Utilization', c.util + '%'],
                ['Coverage gap', c.gap + '%'],
              ].map(([k, v]) => (
                <span key={k} className="flex justify-between text-xs text-soft">
                  {k}<b className="font-mono font-medium text-ink">{v}</b>
                </span>
              ))}
            </span>
          </button>
        ))}
      </div>
      {open && <StateCoin city={open} onClose={() => setOpen(null)} />}
            <div className="absolute -bottom-2 left-1/2 z-20 flex -translate-x-1/2 flex-wrap items-center justify-center gap-2" onPointerDown={(e) => e.stopPropagation()}>
        {['Maharashtra', 'Rajasthan', 'Karnataka', 'Assam'].map((st) => (
          <button key={st} onClick={() => setOpen(CITIES.find((c) => c.state === st)!)} className="glass hover-glow rounded-full px-3 py-1.5 font-mono text-[11px] text-ink">
            ⬡ {st}
          </button>
        ))}
      </div>
      <p className="pointer-events-none absolute -bottom-9 left-1/2 -translate-x-1/2 whitespace-nowrap font-mono text-[10px] uppercase tracking-widest text-soft">Drag to rotate · click a pin to open its state</p>
    </div>
  )
}
