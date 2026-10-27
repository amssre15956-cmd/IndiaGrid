import { useId, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { Icon } from './icons'
import './decision-refine.css'

type Vars = CSSProperties & Record<`--${string}`, string | number>

/* ---------- generic CSS 3D cuboid ---------- */
function Box({ w, h, d, x = 0, y = 0, z = 0, c, className = '', front, back }: { w: number, h: number, d: number, x?: number, y?: number, z?: number, c: string, className?: string, front?: ReactNode, back?: ReactNode }) {
  const style: Vars = { '--w': `${w}px`, '--h': `${h}px`, '--d': `${d}px`, '--c': c, transform: `translate3d(${x}px,${y}px,${z}px)` }
  return <div className={`box ${className}`} style={style}>
    <div className="face f-front">{front}</div><div className="face f-back">{back}</div>
    <div className="face f-left" /><div className="face f-right" /><div className="face f-top" /><div className="face f-bottom" />
  </div>
}

/* ---------- KPI 1: 3D charging pump + energy flow ---------- */
export function PumpScene() {
  return <div className="pump-scene">
    <div className="pump-stage">
      <div className="pump-base-glow" />
      <div className="pump-orbit"><div className="pump-extra">
        <Box w={38} h={6} d={30} y={34} c="#16304f" />
        <Box w={30} h={62} d={22} c="#1d4a78" front={<div className="pump-screen"><b>⚡</b><i /></div>} back={<div className="pump-screen"><b>⚡</b><i /></div>} />
        <Box w={34} h={6} d={26} y={-34} c="#3fd8f5" />
        <Box w={7} h={16} d={7} x={20} y={-2} z={0} c="#35f5a1" className="glow-box" />
      </div></div>
    </div>
    <div className="pump-flow">
      <span className="flow-line" />
      {Array.from({ length: 7 }, (_, i) => <span key={i} className="spark" style={{ '--i': i } as Vars} />)}
      <svg className="pump-ev" viewBox="0 0 70 30" aria-hidden="true">
        <path d="M2 21c0-4 2-6 5-7l9-2 9-8c1-1 3-2 5-2h13c3 0 5 1 7 3l8 7 8 1c3 1 4 3 4 6v3H2z" fill="#3fd8f5" opacity=".92" />
        <path d="M25 12l8-7h10c2 0 3 1 4 2l5 5z" fill="#0b1b33" opacity=".75" />
        <circle cx="18" cy="24" r="5" fill="#07101f" stroke="#c9d6e8" strokeWidth="1.6" /><circle cx="54" cy="24" r="5" fill="#07101f" stroke="#c9d6e8" strokeWidth="1.6" />
        <circle cx="61" cy="14" r="2.2" fill="#35f5a1" className="port-blink" />
      </svg>
    </div>
  </div>
}

/* ---------- KPI 2: rotating 3D EV inside animated coverage ring ---------- */
export function CoverageCar() {
  return <div className="cov-scene">
    <div className="cov-ring" />
    <div className="cov-ticks" />
    <div className="cov-car-wrap">
      <div className="car3d ev-mark" role="img" aria-label="EV">
        {Array.from({ length: 9 }, (_, i) => <span key={i} className={i === 8 ? 'ev-layer ev-top' : 'ev-layer'} style={{ transform: `translateZ(${(i - 4) * 1.6}px)` }}>EV</span>)}
      </div>
    </div>
  </div>
}

/* ---------- India outline (incl. J&K, Ladakh, PoK, Gilgit-Baltistan) ---------- */
const OUTLINE: [number, number][] = [
  [74.0, 37.0], [75.5, 37.1], [77.0, 35.7], [78.0, 35.6], [80.2, 35.4], [80.3, 34.2], [79.5, 32.8], [78.8, 32.2], [78.7, 31.6], [79.2, 30.9], [80.2, 30.4], [80.5, 29.7], [80.1, 28.8],
  [81.0, 28.5], [82.5, 27.7], [84.0, 27.3], [85.7, 26.6], [87.0, 26.4], [88.1, 26.5], [88.3, 27.0], [88.8, 27.4], [88.9, 28.0], [88.6, 27.6], [89.8, 26.7], [92.0, 26.9], [92.1, 27.8], [93.5, 28.6],
  [95.0, 29.3], [96.2, 29.0], [97.3, 28.2], [96.8, 27.3], [96.0, 26.3], [95.3, 26.5], [94.6, 25.2], [94.5, 24.0], [93.5, 23.0], [93.2, 22.2], [92.6, 22.0], [92.3, 23.5], [91.6, 24.2],
  [91.2, 25.2], [90.0, 25.2], [89.8, 26.0], [89.0, 26.3], [88.5, 25.2], [88.0, 24.7], [88.7, 23.5], [88.8, 22.4], [89.0, 21.7], [87.0, 21.5], [86.8, 20.8], [85.0, 19.5], [83.5, 17.8],
  [82.3, 16.5], [80.8, 15.8], [80.2, 13.5], [79.9, 11.5], [79.3, 10.3], [78.2, 8.9], [77.5, 8.1], [76.5, 9.0], [75.5, 11.5], [74.7, 13.5], [73.8, 16.0], [72.8, 19.0], [72.8, 21.0],
  [72.2, 21.2], [70.5, 20.8], [69.0, 22.3], [70.3, 22.9], [68.5, 23.7], [69.5, 24.3], [70.3, 25.0], [70.0, 26.0], [69.5, 27.2], [70.5, 28.0], [71.5, 27.9], [72.8, 29.0], [74.0, 29.7],
  [74.5, 31.0], [74.3, 31.9], [74.0, 32.7], [73.5, 33.6], [73.0, 34.5], [72.7, 35.5], [73.5, 36.4],
]
export const px = (lon: number) => ((lon - 68) * 6.4).toFixed(1)
export const py = (lat: number) => ((37.3 - lat) * 6.4).toFixed(1)
export const INDIA_PATH = 'M' + OUTLINE.map(([lo, la]) => `${px(lo)} ${py(la)}`).join('L') + 'Z'
const PINS: [number, number, boolean][] = [[80.95, 26.85, true], [77.4, 28.5, true], [77.4, 28.65, false], [80.3, 26.45, true], [83.0, 25.3, true], [72.9, 19.1, false], [77.6, 13.0, false], [85.1, 25.6, true]]

export function IndiaGlyph({ small = false }: { small?: boolean }) {
  const id = useId().replace(/:/g, '')
  return <svg viewBox="0 0 190 198" className={small ? 'india-svg small' : 'india-svg'} aria-label="Map of India including Jammu and Kashmir, Ladakh and PoK">
    <defs><clipPath id={`n${id}`}><rect x="0" y="0" width="190" height={py(32.6)} /></clipPath><linearGradient id={`g${id}`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="currentColor" stopOpacity=".95" /><stop offset="1" stopColor="currentColor" stopOpacity=".55" /></linearGradient></defs>
    <path d={INDIA_PATH} fill={`url(#g${id})`} stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
    <path d={INDIA_PATH} clipPath={`url(#n${id})`} fill="#fff" opacity=".28" />
    {!small && <text x="86" y="17" fontSize="7" fill="#fff" opacity=".85" fontFamily="var(--font-mono)">J&amp;K · LADAKH</text>}
    {PINS.map(([lo, la, bad], i) => <circle key={i} cx={px(lo)} cy={py(la)} r={small ? 3 : 4} fill={bad ? '#ff6b5f' : '#35f5a1'} stroke="#07101f" strokeWidth=".8" className="map-marker" />)}
  </svg>
}

/* ---------- KPI 3: continuously flipping 3D coin ---------- */
export function CoinMap() {
  return <div className="coin-scene">
    <div className="coin3d">
      {[-3, -1.5, 0, 1.5, 3].map(z => <span key={z} className="coin-rim" style={{ transform: `translateZ(${z}px)` }} />)}
      <div className="coin-face coin-front"><IndiaGlyph small /></div>
      <div className="coin-face coin-back"><IndiaGlyph small /></div>
    </div>
    <span className="coin-shadow" />
    <span className="tip">28 underserved districts identified</span>
  </div>
}

/* ---------- Charger-type mix: floating 3D connector icons ---------- */
function ConnIcon({ k }: { k: string }) {
  const dot = (cx: number, cy: number, r = 2) => <circle key={`${cx}${cy}`} cx={cx} cy={cy} r={r} fill="currentColor" stroke="none" />
  switch (k) {
    case 'CCS2': return <svg viewBox="0 0 48 48"><path d="M8 20a16 16 0 0 1 32 0v2H8z" /><path d="M7 22h34v10a8 8 0 0 1-8 8H15a8 8 0 0 1-8-8z" />{[[17, 15], [24, 12], [31, 15]].map(([a, b]) => dot(a, b))}<circle cx="16" cy="32" r="4.5" /><circle cx="32" cy="32" r="4.5" />{dot(24, 29, 1.8)}</svg>
    case 'Type 2 AC': return <svg viewBox="0 0 48 48"><path d="M7 16a17 17 0 0 1 34 0v14a17 17 0 0 1-34 0z" />{[[16, 16], [24, 14], [32, 16], [14, 26], [34, 26], [24, 38]].map(([a, b]) => dot(a, b))}<circle cx="24" cy="27" r="3.6" /></svg>
    case 'Bharat AC': return <svg viewBox="0 0 48 48"><circle cx="24" cy="24" r="18" /><circle cx="24" cy="15" r="4" /><circle cx="15" cy="30" r="4" /><circle cx="33" cy="30" r="4" />{dot(24, 24, 1.6)}</svg>
    case 'Bharat DC': return <svg viewBox="0 0 48 48"><rect x="6" y="9" width="36" height="30" rx="10" /><circle cx="17" cy="24" r="5.5" /><circle cx="31" cy="24" r="5.5" />{dot(24, 14, 1.8)}{dot(24, 34, 1.8)}</svg>
    default: return <svg viewBox="0 0 48 48"><circle cx="24" cy="24" r="18" /><circle cx="24" cy="24" r="12" strokeDasharray="2 4" />{[[24, 12], [24, 36], [12, 24], [36, 24], [15.5, 15.5], [32.5, 32.5]].map(([a, b]) => dot(a, b, 1.7))}<circle cx="17" cy="29" r="3.2" /><circle cx="31" cy="19" r="3.2" /></svg>
  }
}
export function ConnectorStage({ mix, selected, onSelect }: { mix: (string | number)[][], selected: number, onSelect: (i: number) => void }) {
  return <div className="conn-stage">
    {mix.map((m, i) => <button key={String(m[0])} className={`conn-tile ${selected === i ? 'on' : ''}`} style={{ '--k': String(m[3]), '--i': i } as Vars} onMouseEnter={() => onSelect(i)} onFocus={() => onSelect(i)}>
      <span className="conn-card">
        {[-4, -8, -12].map(z => <i key={z} style={{ transform: `translateZ(${z}px)` }} />)}
        <span className="conn-face"><ConnIcon k={String(m[0])} /></span>
      </span>
      <b>{m[0]}</b><small>{m[1]}%</small>
    </button>)}
  </div>
}

/* ---------- Priority rank: minimal chart -> detailed ranking ---------- */
export function RankChart({ districts, active, setActive, onMap }: { districts: (string | number)[][], active: number, setActive: (i: number) => void, onMap: () => void }) {
  const [open, setOpen] = useState(false)
  const n = districts.length
  const pts = districts.map((d, i) => [34 + (i * 532) / (n - 1), 252 - Number(d[2]) * 2.3] as [number, number])
  const line = pts.reduce((acc, [x, y], i) => i === 0 ? `M${x} ${y}` : `${acc} C${(pts[i - 1][0] + x) / 2} ${pts[i - 1][1]} ${(pts[i - 1][0] + x) / 2} ${y} ${x} ${y}`, '')
  return <div className={`rank-stage ${open ? 'open' : ''}`} tabIndex={0} onClick={() => setOpen(o => !o)} role="group" aria-label="District priority ranking. Hover, focus or tap to reveal details.">
    <svg className="rank-min" viewBox="0 0 600 290" aria-hidden="true">
      <defs><linearGradient id="rankArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ff6b5f" stopOpacity=".42" /><stop offset="1" stopColor="#9b8cff" stopOpacity="0" /></linearGradient><linearGradient id="rankLine" x1="0" x2="1"><stop offset="0" stopColor="#ff6b5f" /><stop offset=".55" stopColor="#f6d365" /><stop offset="1" stopColor="#35f5a1" /></linearGradient></defs>
      {[0, 25, 50, 75].map(v => <g key={v}><line x1="22" x2="580" y1={252 - v * 2.3} y2={252 - v * 2.3} className="rm-grid" /><text x="0" y={255 - v * 2.3} className="rm-axis">{v}</text></g>)}
      <path d={`${line} L${pts[n - 1][0]} 252 L${pts[0][0]} 252Z`} fill="url(#rankArea)" className="rm-area" />
      {pts.map(([x, y], i) => <line key={i} x1={x} x2={x} y1={y} y2="252" className="rm-stem" style={{ '--i': i } as Vars} />)}
      <path d={line} fill="none" stroke="url(#rankLine)" strokeWidth="2.2" pathLength="100" className="rm-line" />
      {pts.map(([x, y], i) => <g key={i}><circle cx={x} cy={y} r="4.2" fill={String(districts[i][4])} className="rm-dot" style={{ '--i': i } as Vars} /><text x={x} y="270" className="rm-rank">{String(i + 1).padStart(2, '0')}</text></g>)}
      <text x={pts[0][0] + 12} y={pts[0][1] - 12} className="rm-callout">{String(districts[0][0])} · {String(districts[0][2])}</text>
    </svg>
    <div className="rank-hint"><span />Hover to reveal district ranking</div>
    <div className="rank-full">
      <div className="rank-rows">
        <div className="rank-head"><span>#</span><span>District</span><span>Gap Score</span><span /><span>Need</span></div>
        {districts.map((d, i) => <button key={String(d[0])} className={active === i ? 'active' : ''} style={{ '--i': i, '--s': Number(d[2]) / 100, '--k': String(d[4]) } as Vars} onMouseEnter={() => setActive(i)} onFocus={() => setActive(i)}>
          <span>{String(i + 1).padStart(2, '0')}</span><strong>{String(d[0])}<small>{String(d[1])}</small></strong><i><em /></i><b>{String(d[2])}</b><u>+{String(d[3])}</u>
        </button>)}
      </div>
      <aside className="rank-detail"><IndiaGlyph small /><p className="mono-label">District snapshot</p><h3>{String(districts[active][0])}</h3><p><b>{String(districts[active][2])}</b> Gap Score</p><p>{String(districts[active][3])} additional chargers required</p><span role="button" onClick={e => { e.stopPropagation(); onMap() }}>View on map <Icon name="arrow" size={14} /></span></aside>
    </div>
  </div>
}

/* ---------- Gap score intelligence ---------- */
const TERMS = [
  { name: 'EVs per charger', term: '0.45 · N(EVs/Charger)', w: 45, pts: 42.3, color: '#ff6b5f', info: 'Higher EV concentration per public charging point increases pressure.' },
  { name: 'Coverage deficit', term: '0.25 · (1 − Coverage)', w: 25, pts: 21.5, color: '#ff9a4b', info: 'Shortfall against the selected target of 100 EVs per charger.' },
  { name: 'Demand context', term: '0.20 · N(Demand)', w: 20, pts: 15.2, color: '#9b8cff', info: 'Population, urbanization, commercial activity, logistics and tourism demand.' },
  { name: 'Corridor deficit', term: '0.10 · N(Corridor)', w: 10, pts: 3.4, color: '#3fd8f5', info: 'Lack of chargers along national and state highways.' },
]
export function GapPanel() {
  const [hot, setHot] = useState<number | null>(null)
  let acc = 0
  const arcs = TERMS.map(t => { const s = acc; acc += t.pts; return { start: s, len: t.pts } })
  return <section className="glass gap-panel">
    <div className="panel-heading"><div><p className="mono-label text-brand">Gap score intelligence</p><h2>Why is this geography underserved?</h2></div>
      <div className="gap-district"><p className="mono-label">Selected district</p><h3>Lucknow <span>Critical</span></h3></div></div>
    <div className="gap-formula" onMouseLeave={() => setHot(null)}>
      <b>GapScore</b><em>=</em><em>100 ×</em><em className="br">[</em>
      {TERMS.map((t, i) => <span key={t.name} className="gap-term-wrap"><button className={`gap-term ${hot === i ? 'hot' : ''}`} style={{ '--k': t.color } as Vars} onMouseEnter={() => setHot(i)} onFocus={() => setHot(i)}>{t.term}</button>{i < 3 && <em>+</em>}</span>)}
      <em className="br">]</em>
    </div>
    <div className="gap-hero" onMouseLeave={() => setHot(null)}>
      <div className="gap-gauge3">
        <svg viewBox="0 0 200 200" role="img" aria-label="Gap score 82.4 out of 100">
          <circle cx="100" cy="100" r="94" className="gg-ticks" pathLength="100" />
          <g transform="rotate(-90 100 100)">
            <circle cx="100" cy="100" r="78" className="gg-track" pathLength="100" />
            {arcs.map((a, i) => <circle key={i} cx="100" cy="100" r="78" pathLength="100" className="gg-seg" style={{ stroke: TERMS[i].color, strokeDasharray: `${Math.max(a.len - 0.5, 0)} ${100 - a.len + 0.5}`, strokeDashoffset: -a.start, opacity: hot === null || hot === i ? 1 : 0.2, '--i': i } as Vars} />)}
          </g>
        </svg>
        <div className="gg-center"><small>Gap Score</small><b>82.4</b><span>/ 100 · Critical priority</span></div>
      </div>
      <div className="gap-bars">
        {TERMS.map((t, i) => <div key={t.name} className={`gap-bar ${hot === i ? 'hot' : ''} ${hot !== null && hot !== i ? 'dim' : ''}`} style={{ '--k': t.color, '--f': t.pts / t.w, '--i': i } as Vars} onMouseEnter={() => setHot(i)}>
          <div className="gb-top"><span><i />{t.name}</span><em>weight {t.w}%</em><b>{t.pts.toFixed(1)}<small> / {t.w}</small></b></div>
          <div className="gb-track"><span /></div>
          <p>{t.info}</p>
        </div>)}
      </div>
    </div>
    <div className="gap-stats">{[['164,920', 'Total EVs'], ['1,285', 'Public points'], ['128.4', 'EVs / charger'], ['76.8%', 'Coverage']].map(([v, l]) => <div key={l}><b>{v}</b><small>{l}</small></div>)}</div>
  </section>
}
