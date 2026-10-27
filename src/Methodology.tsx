import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { Icon } from './icons'
import { Card, Chip, Formula, Slider, Stat, fmt, PRIORITIES, priorityOf } from './meth-ui'
import { CleaningFlow, IntegrationFlow } from './meth-flow'
import { GapExplainer, ForecastLab } from './meth-score'
import { CorridorValidation } from './meth-corridor'
import './meth-refine.css'

/* ───────────────────────── content ───────────────────────── */

const SECTIONS = [
  { id: 'cleaning', letter: 'A', label: 'Data cleaning' },
  { id: 'integration', letter: 'B', label: 'Data integration' },
  { id: 'gap', letter: 'C', label: 'Gap Score' },
  { id: 'forecast', letter: 'D', label: 'Forecasting method' },
  { id: 'corridor', letter: 'E', label: 'Corridor & validation' },
  { id: 'dashboard', letter: 'F', label: 'Decision dashboard' },
  { id: 'map', letter: 'G', label: 'National GIS map' },
  { id: 'estimator', letter: 'H', label: 'Charger estimator' },
  { id: 'scale', letter: 'I', label: 'Data & scalability' },
]

const STANDARDISED = ['State / UT names', 'District names', 'Fuel types', 'Vehicle categories', 'Connector types', 'Time periods']
const DEDUPE = ['Station name', 'Operator', 'PIN code', 'Rounded coordinates', 'Haversine distance']

const FLAGS: [string, string, string][] = [
  ['OK', 'Record passed every check.', 'var(--green)'],
  ['SAMPLE', 'Synthetic prototype data, never presented as official.', '#ffb454'],
  ['MISSING_COORDINATE', 'No latitude / longitude supplied.', '#ff5d73'],
  ['INVALID_COORDINATE', 'Coordinates fall outside the valid bounding box.', '#ff5d73'],
  ['DUPLICATE_SUSPECT', 'Matches another record by name, operator and distance.', 'var(--violet)'],
  ['UNMATCHED_DISTRICT', 'Spatial join found no containing district.', '#ffb454'],
  ['STALE_RECORD', 'Not refreshed within the freshness window.', 'var(--cyan)'],
]



const EXAMPLE = { evs: 40000, pts: 300, target: 100, demand: 0.7, corr: 0.4, ceil: 500 / 3, growth: 18, years: 3 }

/* ───────────────────────── helpers ───────────────────────── */


function Section({ id, letter, title, lead, children }: { id: string; letter: string; title: string; lead: string; children: React.ReactNode }) {
  return (
    <section id={`m-${id}`} aria-labelledby={`m-${id}-h`} className="scroll-mt-24 border-t border-line pt-12 first:border-0 first:pt-0">
      <p className="mono-label mb-2 text-brand">Section {letter}</p>
      <h2 id={`m-${id}-h`} className="text-2xl font-bold leading-tight md:text-3xl">{title}</h2>
      <p className="mt-3 max-w-3xl leading-relaxed text-soft">{lead}</p>
      <div className="mt-8 space-y-6">{children}</div>
    </section>
  )
}

/* ───────────────────────── A. data cleaning ───────────────────────── */

function CoordChecker() {
  const [lat, setLat] = useState('26.85')
  const [lon, setLon] = useState('80.95')
  const la = parseFloat(lat), lo = parseFloat(lon)
  const empty = lat.trim() === '' || lon.trim() === ''
  const valid = !isNaN(la) && !isNaN(lo)
  const inIndia = valid && la >= 6 && la <= 37.5 && lo >= 68 && lo <= 97.5
  const flag = empty ? 'MISSING_COORDINATE' : !inIndia ? 'INVALID_COORDINATE' : 'OK'
  const color = flag === 'OK' ? 'var(--green)' : '#ff5d73'
  return (
    <Card title="Try the coordinate validator">
      <div className="grid gap-3 sm:grid-cols-2">
        {([['Latitude', lat, setLat], ['Longitude', lon, setLon]] as const).map(([l, v, set]) => (
          <label key={l} className="block text-sm">
            <span className="mono-label">{l}</span>
            <input value={v} onChange={(e) => set(e.target.value)} inputMode="decimal" className="mt-1 w-full rounded-xl border border-line bg-[var(--surface)] px-3 py-2 font-mono text-ink" />
          </label>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2" role="status">
        <Chip color={color}>{flag}</Chip>
        <Chip color={inIndia ? 'var(--green)' : undefined}>India box: {inIndia ? 'inside' : 'outside'}</Chip>
      </div>
      <p className="mt-3 text-xs text-soft">India bounding box: lat 6.0–37.5, lon 68.0–97.5. Flagged records are stored separately for review.</p>
    </Card>
  )
}

/* ───────────────────────── B. data integration ───────────────────────── */

/* ───────────────────────── C + D. scenario (shared inputs) ───────────────────────── */

function useScenario() {
  const [s, setS] = useState(EXAMPLE)
  const [w, setW] = useState({ e: 45, c: 25, d: 20, r: 10 })
  const set = (k: keyof typeof EXAMPLE) => (v: number) => setS((p) => ({ ...p, [k]: v }))
  const reset = () => { setS(EXAMPLE); setW({ e: 45, c: 25, d: 20, r: 10 }) }

  const perCharger = s.evs / s.pts
  const nPer = Math.min(1, perCharger / s.ceil)
  const required = Math.ceil(s.evs / s.target)
  const coverage = Math.min(1, s.pts / (s.evs / s.target))
  const wsum = w.e + w.c + w.d + w.r || 1
  const parts = [
    { k: 'EVs per charger', weight: w.e / wsum, v: nPer, color: 'var(--green)' },
    { k: 'Coverage deficit', weight: w.c / wsum, v: 1 - coverage, color: 'var(--cyan)' },
    { k: 'Demand context', weight: w.d / wsum, v: s.demand, color: 'var(--violet)' },
    { k: 'Corridor deficit', weight: w.r / wsum, v: s.corr, color: '#ffb454' },
  ].map((p) => ({ ...p, pts: 100 * p.weight * p.v }))
  const score = parts.reduce((a, p) => a + p.pts, 0)
  const forecast = Array.from({ length: s.years + 1 }, (_, n) => {
    const ev = s.evs * Math.pow(1 + s.growth / 100, n)
    return { n, ev, req: Math.ceil(ev / s.target) }
  })
  return { s, set, w, setW, reset, wsum, perCharger, required, coverage, parts, score, forecast }
}
export type Scenario = ReturnType<typeof useScenario>

function Gauge({ score }: { score: number }) {
  const [shown, setShown] = useState(0)
  useEffect(() => {
    const t = requestAnimationFrame(() => setShown(score))
    return () => cancelAnimationFrame(t)
  }, [score])
  const pr = priorityOf(score)
  const R = 78, C = 2 * Math.PI * R
  return (
    <div className="relative h-56 w-56 shrink-0">
      <svg viewBox="0 0 200 200" className="-rotate-90" role="img" aria-label={`Gap Score ${score.toFixed(2)} out of 100, priority ${pr.label}`}>
        <defs>
          <linearGradient id="gauge-track" x1="0" y1="1" x2="1" y2="0">
            <stop offset="0%" stopColor="#3ddc97" /><stop offset="45%" stopColor="#f5d04a" /><stop offset="75%" stopColor="#ff9a3c" /><stop offset="100%" stopColor="#ff5d73" />
          </linearGradient>
        </defs>
        <circle cx="100" cy="100" r={R} fill="none" stroke="var(--line)" strokeWidth="16" />
        <circle cx="100" cy="100" r={R} fill="none" stroke="url(#gauge-track)" strokeWidth="4" strokeDasharray="2 4" opacity="0.7" transform="scale(1.16) translate(-14 -14)" style={{ transformOrigin: '100px 100px' }} />
        <circle cx="100" cy="100" r={R} fill="none" stroke={pr.color} strokeWidth="16" strokeLinecap="round" strokeDasharray={`${(Math.min(shown, 100) / 100) * C} ${C}`}
          style={{ transition: 'stroke-dasharray .9s cubic-bezier(.2,.8,.2,1), stroke .4s', filter: `drop-shadow(0 0 8px ${pr.color})` }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-4xl font-bold">{score.toFixed(2)}</span>
        <span className="font-mono text-xs text-soft">/ 100</span>
        <span className="mt-1 rounded-full border px-2.5 py-0.5 font-mono text-[10px] uppercase" style={{ borderColor: pr.color, color: pr.color }}>{pr.label}</span>
      </div>
    </div>
  )
}

/* ───────────────────────── shared sample district data (E–G) ───────────────────────── */

type District = { name: string; lat: number; lon: number; evs: number; pts: number; fast: number; demand: number; corr: number }
const DISTRICTS: District[] = [
  { name: 'Lucknow', lat: 26.85, lon: 80.95, evs: 52000, pts: 410, fast: 120, demand: 0.85, corr: 0.3 },
  { name: 'Ghaziabad', lat: 28.67, lon: 77.45, evs: 46000, pts: 260, fast: 70, demand: 0.9, corr: 0.4 },
  { name: 'Kanpur Nagar', lat: 26.45, lon: 80.35, evs: 31000, pts: 190, fast: 45, demand: 0.7, corr: 0.35 },
  { name: 'Agra', lat: 27.18, lon: 78.01, evs: 24000, pts: 120, fast: 40, demand: 0.65, corr: 0.5 },
  { name: 'Meerut', lat: 28.98, lon: 77.7, evs: 22000, pts: 75, fast: 18, demand: 0.6, corr: 0.55 },
  { name: 'Varanasi', lat: 25.32, lon: 82.97, evs: 21000, pts: 85, fast: 22, demand: 0.6, corr: 0.45 },
  { name: 'Prayagraj', lat: 25.43, lon: 81.85, evs: 18000, pts: 70, fast: 15, demand: 0.55, corr: 0.4 },
  { name: 'Gorakhpur', lat: 26.76, lon: 83.37, evs: 12000, pts: 40, fast: 8, demand: 0.5, corr: 0.5 },
  { name: 'Bareilly', lat: 28.35, lon: 79.43, evs: 9500, pts: 28, fast: 5, demand: 0.45, corr: 0.6 },
  { name: 'Aligarh', lat: 27.88, lon: 78.08, evs: 8000, pts: 22, fast: 6, demand: 0.4, corr: 0.55 },
  { name: 'Jhansi', lat: 25.45, lon: 78.57, evs: 6000, pts: 16, fast: 4, demand: 0.4, corr: 0.7 },
]
const MAX_PER = Math.max(...DISTRICTS.map((d) => d.evs / d.pts))
const MIX: [string, number][] = [['2W', 0.62], ['3W', 0.14], ['4W', 0.19], ['Bus', 0.01], ['Goods', 0.04]]
const COMPONENT_COLORS = ['var(--green)', 'var(--cyan)', 'var(--violet)', '#ffb454']
const BAND = ['#3ddc97', '#f5d04a', '#ff9a3c', '#ff5d73']
const bandOf = (n: number) => (n < 0.35 ? 0 : n < 0.55 ? 1 : n < 0.75 ? 2 : 3)

function metricsOf(d: District, target = 100, growth = 18, years = 3) {
  const per = d.evs / d.pts
  const req = Math.ceil(d.evs / target)
  const cov = Math.min(1, d.pts / (d.evs / target))
  const raw = [
    { k: 'EVs per charger', weight: 0.45, v: Math.min(1, per / MAX_PER) },
    { k: 'Coverage deficit', weight: 0.25, v: 1 - cov },
    { k: 'Demand context', weight: 0.2, v: d.demand },
    { k: 'Corridor deficit', weight: 0.1, v: d.corr },
  ]
  const parts = raw.map((p, i) => ({ ...p, color: COMPONENT_COLORS[i], pts: 100 * p.weight * p.v }))
  const gap = parts.reduce((a, p) => a + p.pts, 0)
  const fEv = d.evs * Math.pow(1 + growth / 100, years)
  const fReq = Math.ceil(fEv / target)
  return { per, req, cov, parts, gap, pr: priorityOf(gap), addNow: Math.max(0, req - d.pts), fEv, fReq, addForecast: Math.max(0, fReq - d.pts) }
}

/* ───────────────────────── E. decision dashboard ───────────────────────── */

function DashboardSection() {
  const rows = useMemo(() => DISTRICTS.map((d) => ({ d, m: metricsOf(d) })).sort((a, b) => b.m.gap - a.m.gap), [])
  const [sel, setSel] = useState(rows[0].d.name)
  const [pf, setPf] = useState<string | null>(null)
  const [minGap, setMinGap] = useState(0)
  const [hov, setHov] = useState<number | null>(null)
  const cur = rows.find((r) => r.d.name === sel)!
  const shown = rows.map((r, i) => ({ ...r, rank: i + 1 })).filter((r) => (!pf || r.m.pr.label === pf) && r.m.gap >= minGap)
  const totEv = rows.reduce((a, r) => a + r.d.evs, 0)
  const totPts = rows.reduce((a, r) => a + r.d.pts, 0)
  const covAvg = rows.reduce((a, r) => a + r.m.cov, 0) / rows.length
  const under = rows.filter((r) => r.m.cov < 0.6).length
  const hiPri = rows.filter((r) => r.m.gap >= 55).length
  const m = cur.m
  const topPart = [...m.parts].sort((a, b) => b.pts - a.pts)[0]
  const why = `${cur.d.name} has ${cur.d.evs > 20000 ? 'high' : 'growing'} EV adoption (${fmt(cur.d.evs)} EVs), ${m.per > 150 ? 'insufficient' : 'stretched'} public charging (${fmt(m.per, 0)} EVs per charger)${cur.d.corr >= 0.5 ? ' and a major highway coverage gap' : ''}. Largest driver: ${topPart.k.toLowerCase()}.`
  const kpis: [string, string, string][] = [
    ['EVs per charging point', fmt(totEv / totPts, 1), 'sample districts'],
    ['Coverage', `${Math.round(covAvg * 100)}%`, 'vs. 100 EVs / charger'],
    ['Underserved districts', String(under), 'coverage below 60%'],
    ['Additional chargers', fmt(rows.reduce((a, r) => a + r.m.addNow, 0)), 'needed today'],
    ['Critical + High', String(hiPri), `of ${rows.length} districts`],
  ]
  return (
    <>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {kpis.map(([k, v, s]) => <Stat key={k} k={k} v={v} sub={s} />)}
      </div>

      <div className="relative overflow-hidden rounded-3xl border border-line p-5 md:p-8" style={{ background: 'linear-gradient(135deg, color-mix(in srgb,var(--green) 10%, transparent), color-mix(in srgb,var(--violet) 14%, transparent))', boxShadow: '0 0 60px -20px var(--glow)' }}>
        <p className="mono-label text-brand">Gap Score · selected district: {cur.d.name}</p>
        <div className="mt-4 flex flex-wrap items-center gap-2 font-mono text-sm md:gap-3 md:text-base" role="group" aria-label="Gap Score equation">
          <span className="font-display text-lg font-bold md:text-2xl">GapScore = 100 ×</span>
          <span className="text-2xl text-soft">[</span>
          {m.parts.map((p, i) => (
            <span key={p.k} className="flex items-center gap-2 md:gap-3">
              <button onMouseEnter={() => setHov(i)} onMouseLeave={() => setHov(null)} onFocus={() => setHov(i)} onBlur={() => setHov(null)}
                className="rounded-xl border px-3 py-2 text-left transition hover:-translate-y-0.5" style={{ borderColor: p.color, background: `color-mix(in srgb, ${p.color} ${hov === i ? 28 : 12}%, transparent)` }}>
                <span className="block text-xl font-bold md:text-2xl" style={{ color: p.color }}>{p.weight.toFixed(2)}</span>
                <span className="block text-[11px] text-ink">× {p.k}</span>
                <span className="block text-[10px] text-soft">= {p.v.toFixed(2)}</span>
              </button>
              {i < 3 && <span className="text-soft">+</span>}
            </span>
          ))}
          <span className="text-2xl text-soft">]</span>
        </div>
        <div className="mt-8 grid items-center gap-8 md:grid-cols-[auto_1fr]">
          <div className="mx-auto"><Gauge score={m.gap} /></div>
          <div>
            <ul className="space-y-4">
              {m.parts.map((p, i) => (
                <li key={p.k} className="transition" style={{ opacity: hov === null || hov === i ? 1 : 0.4 }}>
                  <div className="mb-1.5 flex items-baseline justify-between text-sm">
                    <span className="flex items-center gap-2 font-medium"><i className="h-3 w-3 rounded-full" style={{ background: p.color }} />{p.k} <span className="font-mono text-xs text-soft">{Math.round(p.weight * 100)}%</span></span>
                    <b className="font-mono">{p.pts.toFixed(1)} <span className="text-xs font-normal text-soft">/ {Math.round(p.weight * 100)}</span></b>
                  </div>
                  <div className="relative h-4 overflow-hidden rounded-full bg-[var(--line)]">
                    <div className="absolute inset-y-0 left-0 rounded-full opacity-25" style={{ width: `${p.weight * 100}%`, background: p.color }} />
                    <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${p.pts}%`, background: p.color, boxShadow: `0 0 12px ${p.color}`, transition: 'width .8s cubic-bezier(.2,.8,.2,1)' }} />
                  </div>
                </li>
              ))}
            </ul>
            <p className="mt-5 rounded-xl border border-line p-3 text-sm leading-relaxed text-soft" style={{ background: 'var(--surface)' }} aria-live="polite"><Chip color={m.pr.color}>{m.pr.label.toUpperCase()}</Chip> <span className="ml-1">{why}</span></p>
          </div>
        </div>
      </div>

      <Card title="District priority ranking">
        <div className="mb-4 flex flex-wrap items-end gap-4">
          <div className="flex flex-wrap gap-2" role="group" aria-label="Priority filter">
            {[null, ...[...PRIORITIES].map((p) => p.label)].map((l) => (
              <button key={l ?? 'all'} onClick={() => setPf(l)} aria-pressed={pf === l} className={`rounded-full border px-3 py-1 text-xs font-medium transition ${pf === l ? 'border-brand bg-brand/10' : 'border-line text-soft'}`}>{l ?? 'All'}</button>
            ))}
          </div>
          <div className="w-48"><Slider label="Min Gap Score" value={minGap} min={0} max={80} onChange={setMinGap} /></div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead><tr className="border-b border-line text-soft">{['#', 'District', 'Priority', 'Gap', 'EVs', 'Points', 'EVs / chg', 'Cov.', 'Add now', 'Add +3y'].map((h) => <th key={h} scope="col" className="mono-label px-2 py-2.5 font-medium">{h}</th>)}</tr></thead>
            <tbody>
              {shown.map((r) => (
                <tr key={r.d.name} onClick={() => setSel(r.d.name)} className={`cursor-pointer border-b border-line transition hover:bg-brand/5 ${sel === r.d.name ? 'bg-brand/10' : ''}`}>
                  <td className="px-2 py-2.5 font-mono text-xs text-soft">{r.rank}</td>
                  <th scope="row" className="px-2 py-2.5 font-semibold"><button onClick={() => setSel(r.d.name)} className="text-left">{r.d.name}</button></th>
                  <td className="px-2 py-2.5"><Chip color={r.m.pr.color}>{r.m.pr.label}</Chip></td>
                  <td className="px-2 py-2.5"><div className="flex items-center gap-2"><span className="font-mono">{r.m.gap.toFixed(1)}</span><span className="hidden h-1.5 w-14 overflow-hidden rounded-full bg-[var(--line)] md:block"><span className="block h-full" style={{ width: `${r.m.gap}%`, background: r.m.pr.color }} /></span></div></td>
                  <td className="px-2 py-2.5 font-mono">{fmt(r.d.evs)}</td>
                  <td className="px-2 py-2.5 font-mono">{fmt(r.d.pts)}</td>
                  <td className="px-2 py-2.5 font-mono">{fmt(r.m.per, 0)}</td>
                  <td className="px-2 py-2.5 font-mono">{Math.round(r.m.cov * 100)}%</td>
                  <td className="px-2 py-2.5 font-mono">{fmt(r.m.addNow)}</td>
                  <td className="px-2 py-2.5 font-mono">{fmt(r.m.addForecast)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {shown.length === 0 && <p className="py-4 text-sm text-soft" role="status">No districts match these filters.</p>}
        </div>
        <p className="mt-3 text-xs text-soft">Illustrative sample data (data_quality_flag = SAMPLE). Target 100 EVs per charger, 18% growth, 3-year horizon.</p>
      </Card>
    </>
  )
}

/* ───────────────────────── F. national GIS map ───────────────────────── */

// Dot-matrix silhouette of Uttar Pradesh, traced from the supplied map image and georeferenced to the state's lat/lon extent.
const UP_MASK = [
  '....####............................................',
  '....####............................................',
  '...#####............................................',
  '...#####............................................',
  '..#########.........................................',
  '.###########........................................',
  '#############.......................................',
  '###############.....................................',
  '###############.....................................',
  '################....................................',
  '..################..................................',
  '..################..................................',
  '..####################..............................',
  '..#########################.........................',
  '..##########################........................',
  '..############################......................',
  '..############################......................',
  '...############################.....................',
  '...###############################..................',
  '..###################################...............',
  '..######################################............',
  '..######################################............',
  '..#############################################.....',
  '..##############################################....',
  '...#############################################....',
  '...##############################################...',
  '...##############################################...',
  '...###############################################..',
  '...###############################################..',
  '..........########################################..',
  '.............#####################################..',
  '.............####################################...',
  '.............####################################...',
  '............########################################',
  '...........#########################################',
  '..........##########################################',
  '........############################################',
  '........#########################################...',
  '........#######################################.....',
  '........######################################......',
  '........#####################################.......',
  '........######.......########################.......',
  '........#######...........####..#############.......',
  '........#######..................############.......',
  '........#######......................########.......',
  '........#######......................########.......',
  '..........#####......................#######........',
  '.....................................#######........',
]
const MC = UP_MASK[0].length, MR = UP_MASK.length
const LON0 = 77.08, LON1 = 84.63, LAT0 = 30.41, LAT1 = 23.87
const MW = 470, MH = 457
const toXY = (lat: number, lon: number): [number, number] => [((lon - LON0) / (LON1 - LON0)) * MW, ((LAT0 - lat) / (LAT0 - LAT1)) * MH]
const inUP = (lat: number, lon: number) => {
  const c = Math.floor(((lon - LON0) / (LON1 - LON0)) * MC), r = Math.floor(((LAT0 - lat) / (LAT0 - LAT1)) * MR)
  return UP_MASK[r]?.[c] === '#'
}
const HIGHWAYS: { name: string; pts: [number, number][] }[] = [
  { name: 'Agra–Lucknow Expressway', pts: [[27.18, 78.01], [26.8, 79.0], [26.85, 80.95]] },
  { name: 'NH-27 Lucknow–Gorakhpur', pts: [[26.85, 80.95], [26.8, 82.2], [26.76, 83.37]] },
  { name: 'NH-19 Kanpur–Varanasi', pts: [[26.45, 80.35], [25.43, 81.85], [25.32, 82.97]] },
  { name: 'Delhi–Meerut Expressway', pts: [[28.67, 77.45], [28.98, 77.7]] },
  { name: 'NH-34 Ghaziabad–Agra', pts: [[28.67, 77.45], [27.88, 78.08], [27.18, 78.01]] },
  { name: 'NH-44 Agra–Jhansi', pts: [[27.18, 78.01], [26.2, 78.5], [25.45, 78.57]] },
  { name: 'NH-30 Lucknow–Prayagraj', pts: [[26.85, 80.95], [25.43, 81.85]] },
  { name: 'NH-30 Lucknow–Bareilly', pts: [[26.85, 80.95], [27.7, 80.2], [28.35, 79.43]] },
]
const OPERATORS = ['Tata Power', 'Statiq', 'EESL', 'ChargeZone', 'Jio-bp pulse']
const rnd = (i: number) => { const x = Math.sin(i * 9301 + 49297) * 233280; return x - Math.floor(x) }
const CHARGERS = DISTRICTS.flatMap((d, di) =>
  Array.from({ length: Math.min(22, Math.max(3, Math.round(d.pts / 12))) }, (_, k) => {
    const lat = d.lat + (rnd(di * 100 + k) - 0.5) * 0.5, lon = d.lon + (rnd(di * 100 + k + 50) - 0.5) * 0.5
    return { id: `${d.name} #${k + 1}`, district: d.name, lat, lon, op: OPERATORS[(di + k) % 5], kw: [22, 30, 60, 120][(di * 3 + k) % 4] }
  }),
)
const km = (a: [number, number], b: [number, number]) => {
  const dy = (a[0] - b[0]) * 111, dx = (a[1] - b[1]) * 111 * Math.cos((a[0] * Math.PI) / 180)
  return Math.hypot(dx, dy)
}
const CELLS = (() => {
  const out: { x: number; y: number; d: string | null }[] = []
  const cw = MW / MC, ch = MH / MR
  for (let r = 0; r < MR; r++) for (let c = 0; c < MC; c++) {
    const lon = LON0 + ((c + 0.5) / MC) * (LON1 - LON0), lat = LAT0 - ((r + 0.5) / MR) * (LAT0 - LAT1)
    if (UP_MASK[r][c] !== '#') { out.push({ x: c * cw + cw / 2, y: r * ch + ch / 2, d: null }); continue }
    let best = DISTRICTS[0].name, bd = Infinity
    for (const d of DISTRICTS) { const dd = km([lat, lon], [d.lat, d.lon]); if (dd < bd) { bd = dd; best = d.name } }
    out.push({ x: c * cw + cw / 2, y: r * ch + ch / 2, d: best })
  }
  return out
})()
const METRICS = [
  { id: 'evs', label: 'EV population', n: (d: District) => d.evs / Math.max(...DISTRICTS.map((x) => x.evs)) },
  { id: 'pts', label: 'Charging points', n: (d: District) => 1 - d.pts / Math.max(...DISTRICTS.map((x) => x.pts)) },
  { id: 'per', label: 'EVs per charger', n: (d: District) => d.evs / d.pts / MAX_PER },
  { id: 'gap', label: 'Gap Score', n: (d: District) => metricsOf(d).gap / 100 },
]

function GisMapSection() {
  const [metric, setMetric] = useState('gap')
  const [sel, setSel] = useState<string | null>('Lucknow')
  const [pin, setPin] = useState<{ lat: number; lon: number } | null>(null)
  const [mode, setMode] = useState<'clusters' | 'points'>('clusters')
  const [showHw, setShowHw] = useState(true)
  const [showCh, setShowCh] = useState(true)
  const [radius, setRadius] = useState(30)
  const [op, setOp] = useState('All')
  const [minKw, setMinKw] = useState(0)
  const mt = METRICS.find((x) => x.id === metric)!
  const colorOf = useMemo(() => Object.fromEntries(DISTRICTS.map((d) => [d.name, BAND[bandOf(mt.n(d))]])), [mt])
  const chargers = CHARGERS.filter((c) => (op === 'All' || c.op === op) && c.kw >= minKw)
  const sd = DISTRICTS.find((d) => d.name === sel) ?? null
  const sm = sd ? metricsOf(sd) : null

  const onMap = (e: React.MouseEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    const x = ((e.clientX - r.left) / r.width) * MW, y = ((e.clientY - r.top) / r.height) * MH
    const lon = LON0 + (x / MW) * (LON1 - LON0), lat = LAT0 - (y / MH) * (LAT0 - LAT1)
    setPin({ lat, lon })
    if (inUP(lat, lon)) setSel(DISTRICTS.reduce((a, d) => (km([lat, lon], [d.lat, d.lon]) < km([lat, lon], [a.lat, a.lon]) ? d : a)).name)
  }
  const pinInfo = pin && {
    inside: inUP(pin.lat, pin.lon),
    district: DISTRICTS.reduce((a, d) => (km([pin.lat, pin.lon], [d.lat, d.lon]) < km([pin.lat, pin.lon], [a.lat, a.lon]) ? d : a)).name,
    near: chargers.map((c) => ({ ...c, dist: km([pin.lat, pin.lon], [c.lat, c.lon]) })).filter((c) => c.dist <= radius).sort((a, b) => a.dist - b.dist),
  }
  const pxy = pin ? toXY(pin.lat, pin.lon) : null

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <Chip color="var(--green)">Data freshness · 26 Oct 2026, 06:00 IST</Chip>
        {['VAHAN', 'BEE EV Yatra', 'Open Charge Map', 'CPO API', 'Government GIS'].map((t) => <Chip key={t}>{t}</Chip>)}
        <Chip color="#ffb454">SAMPLE data</Chip>
      </div>

      <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
        <div role="radiogroup" aria-label="Map metric" className="flex flex-wrap gap-2">
          {METRICS.map((x) => (
            <button key={x.id} role="radio" aria-checked={metric === x.id} onClick={() => setMetric(x.id)} className={`rounded-xl border px-3.5 py-2 text-sm font-medium transition hover:-translate-y-0.5 ${metric === x.id ? 'border-brand bg-brand/10' : 'border-line text-soft'}`}>{x.label}</button>
          ))}
        </div>
        <label className="text-xs text-soft">Operator<select value={op} onChange={(e) => setOp(e.target.value)} className="ml-2 rounded-lg border border-line bg-[var(--surface)] px-2 py-1.5 text-sm text-ink">{['All', ...OPERATORS].map((o) => <option key={o}>{o}</option>)}</select></label>
        <label className="text-xs text-soft">Min power<select value={minKw} onChange={(e) => setMinKw(+e.target.value)} className="ml-2 rounded-lg border border-line bg-[var(--surface)] px-2 py-1.5 text-sm text-ink">{[0, 30, 60, 120].map((o) => <option key={o} value={o}>{o ? `≥ ${o} kW` : 'Any'}</option>)}</select></label>
        <div className="w-44"><Slider label="Search radius" value={radius} min={5} max={80} unit=" km" onChange={setRadius} /></div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="glass relative overflow-hidden rounded-2xl p-3" style={{ background: 'color-mix(in srgb, var(--bg) 75%, black)' }}>
          <div className="absolute right-4 top-4 z-10 flex flex-col gap-1.5 text-xs">
            {[['Highways', showHw, setShowHw], ['Chargers', showCh, setShowCh]].map(([l, v, f]) => (
              <button key={l as string} aria-pressed={v as boolean} onClick={() => (f as (b: boolean) => void)(!(v as boolean))} className={`rounded-lg border px-2.5 py-1 ${v ? 'border-brand bg-brand/10' : 'border-line text-soft'}`}>{l as string}</button>
            ))}
            {showCh && <button onClick={() => setMode(mode === 'clusters' ? 'points' : 'clusters')} className="rounded-lg border border-line px-2.5 py-1 text-soft">{mode === 'clusters' ? 'Show points' : 'Show clusters'}</button>}
          </div>
          <svg viewBox={`0 0 ${MW} ${MH}`} className="mx-auto h-auto w-full max-w-[560px] cursor-crosshair" onClick={onMap} role="img" aria-label="Interactive map of Uttar Pradesh districts. Click to drop a pin.">
            <g style={{ transition: 'opacity .4s' }}>
              {CELLS.map((c) => c.d === null
                ? <circle key={`${c.x}-${c.y}`} cx={c.x} cy={c.y} r="1.1" fill="var(--cyan)" opacity="0.18" />
                : <circle key={`${c.x}-${c.y}`} cx={c.x} cy={c.y} r="3.7" fill={colorOf[c.d]} opacity={sel === null || sel === c.d ? 0.92 : 0.3} style={{ transition: 'opacity .3s, fill .4s' }} />)}
            </g>
            {showHw && HIGHWAYS.map((h) => <polyline key={h.name} points={h.pts.map(([la, lo]) => toXY(la, lo).join(',')).join(' ')} fill="none" stroke="var(--cyan)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ filter: 'drop-shadow(0 0 4px var(--cyan))' }}><title>{h.name}</title></polyline>)}
            {showCh && mode === 'points' && chargers.map((c) => { const [x, y] = toXY(c.lat, c.lon); return <circle key={c.id} cx={x} cy={y} r="2.4" fill="#fff" opacity="0.9" style={{ filter: 'drop-shadow(0 0 3px #fff)' }}><title>{`${c.id} · ${c.op} · ${c.kw} kW`}</title></circle> })}
            {showCh && mode === 'clusters' && DISTRICTS.map((d) => {
              const n = chargers.filter((c) => c.district === d.name).length
              if (!n) return null
              const [x, y] = toXY(d.lat, d.lon)
              return (
                <g key={d.name} style={{ cursor: 'pointer' }} onClick={(e) => { e.stopPropagation(); setSel(d.name) }}>
                  <circle cx={x} cy={y} r={9 + n * 0.55} fill="var(--bg)" stroke="var(--green)" strokeWidth="2" style={{ filter: 'drop-shadow(0 0 6px var(--green))' }} />
                  <text x={x} y={y + 4} textAnchor="middle" fontSize="11" fontWeight="700" fill="var(--text)" fontFamily="monospace">{n}</text>
                </g>
              )
            })}
            {DISTRICTS.map((d) => { const [x, y] = toXY(d.lat, d.lon); return <text key={d.name} x={x} y={y - 15 - (showCh && mode === 'clusters' ? 6 : 0)} textAnchor="middle" fontSize="9" fill="var(--text)" style={{ paintOrder: 'stroke', stroke: 'var(--bg)', strokeWidth: 3 }}>{d.name}</text> })}
            {pxy && (
              <g>
                <circle cx={pxy[0]} cy={pxy[1]} r={radius / 1.59} fill="var(--violet)" opacity="0.12" stroke="var(--violet)" strokeDasharray="4 3" />
                <circle cx={pxy[0]} cy={pxy[1]} r="6" fill="none" stroke="#fff" className="animate-ping" style={{ transformOrigin: `${pxy[0]}px ${pxy[1]}px` }} />
                <circle cx={pxy[0]} cy={pxy[1]} r="5" fill="#fff" style={{ filter: 'drop-shadow(0 0 8px #fff)' }} />
              </g>
            )}
          </svg>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 px-1 text-[11px] text-soft">
            <span className="flex items-center gap-3">{[['Adequate', 0], ['Moderate gap', 1], ['High gap', 2], ['Critical gap', 3]].map(([l, i]) => <span key={l as string} className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-sm" style={{ background: BAND[i as number] }} />{l}</span>)}</span>
            <span className="flex items-center gap-1.5"><i className="h-0.5 w-4 bg-[var(--cyan)]" />National highway</span>
          </div>
          {pinInfo && pin && (
            <div className="rise absolute bottom-14 left-4 z-10 w-64 rounded-2xl border p-3 text-xs" style={{ background: 'var(--surface-strong)', borderColor: 'var(--violet)', backdropFilter: 'blur(10px)' }} role="status">
              <div className="flex items-start justify-between"><p className="mono-label text-brand">Pin drop</p><button onClick={() => setPin(null)} aria-label="Clear pin" className="text-soft hover:text-ink">✕</button></div>
              <p className="mt-1 font-mono">{pin.lat.toFixed(4)}° N, {pin.lon.toFixed(4)}° E</p>
              <p className="mt-1"><b>{pinInfo.inside ? pinInfo.district : 'Outside the prototype area'}</b>{pinInfo.inside && <span className="text-soft"> · Uttar Pradesh</span>}</p>
              <p className="text-soft">{pinInfo.near.length} chargers within {radius} km</p>
              <ul className="mt-1.5 space-y-0.5">
                {pinInfo.near.slice(0, 3).map((c) => <li key={c.id} className="flex justify-between gap-2"><span className="truncate">{c.op} · {c.kw} kW</span><span className="font-mono text-soft">{c.dist.toFixed(1)} km</span></li>)}
                {pinInfo.near.length === 0 && <li className="text-soft">None found. Widen the search radius.</li>}
              </ul>
            </div>
          )}
        </div>

        <aside aria-label="District drill-down" className="glass rounded-2xl p-5" aria-live="polite">
          {sd && sm ? (
            <>
              <div className="flex items-start justify-between gap-2">
                <div><p className="mono-label">District</p><h3 className="font-display text-xl font-bold">{sd.name}</h3><p className="text-xs text-soft">Uttar Pradesh</p><p className="mt-0.5 font-mono text-[11px] text-brand">{sd.lat.toFixed(4)}° N, {sd.lon.toFixed(4)}° E</p></div>
                <button onClick={() => setSel(null)} aria-label="Close district panel" className="text-soft hover:text-ink">✕</button>
              </div>
              <div className="mt-3 flex items-center gap-3"><span className="font-display text-3xl font-bold">{sm.gap.toFixed(1)}</span><Chip color={sm.pr.color}>{sm.pr.label.toUpperCase()}</Chip></div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <Stat k="Total EVs" v={fmt(sd.evs)} />
                <Stat k="Charging points" v={fmt(sd.pts)} sub={`${sd.fast} fast`} />
                <Stat k="EVs / charger" v={fmt(sm.per, 0)} />
                <Stat k="Coverage" v={`${Math.round(sm.cov * 100)}%`} />
                <Stat k="Add now" v={fmt(sm.addNow)} />
                <Stat k="Add +3y" v={fmt(sm.addForecast)} />
              </div>
              <p className="mono-label mb-2 mt-4">EVs by category</p>
              <div className="flex h-3 overflow-hidden rounded-full">{MIX.map(([k, f], i) => <span key={k} title={k} style={{ width: `${f * 100}%`, background: ['var(--green)', 'var(--cyan)', 'var(--violet)', '#ffb454', '#ff5d73'][i] }} />)}</div>
              <ul className="mt-2 grid grid-cols-2 gap-x-3 text-xs text-soft">{MIX.map(([k, f]) => <li key={k} className="flex justify-between"><span>{k}</span><b className="font-mono text-ink">{fmt(sd.evs * f)}</b></li>)}</ul>
              <p className="mono-label mb-1.5 mt-4">Gap Score contributions</p>
              <div className="flex h-3 overflow-hidden rounded-full bg-[var(--line)]">{sm.parts.map((p) => <span key={p.k} title={`${p.k}: ${p.pts.toFixed(1)}`} style={{ width: `${p.pts}%`, background: p.color }} />)}</div>
            </>
          ) : (
            <p className="text-sm text-soft">Select a district on the map or click anywhere to see its EVs, chargers, Gap Score and charger requirement.</p>
          )}
        </aside>
      </div>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Select district">
        {DISTRICTS.map((d) => <button key={d.name} title={`${d.lat.toFixed(4)}° N, ${d.lon.toFixed(4)}° E`} onClick={() => setSel(d.name)} aria-pressed={sel === d.name} className={`rounded-full border px-3 py-1 text-xs ${sel === d.name ? 'border-brand bg-brand/10' : 'border-line text-soft'}`}>{d.name}</button>)}
      </div>
      <details className="glass rounded-2xl p-4 text-xs" open>
        <summary className="mono-label cursor-pointer">Pinned locations · latitude / longitude (WGS84)</summary>
        <ul className="mt-3 grid gap-x-6 gap-y-1.5 sm:grid-cols-2 lg:grid-cols-3">
          {DISTRICTS.map((d) => <li key={d.name} className="flex items-center justify-between gap-2 border-b border-line py-1"><button onClick={() => setSel(d.name)} className="font-medium hover:text-brand">{d.name}</button><span className="font-mono text-soft">{d.lat.toFixed(4)}° N, {d.lon.toFixed(4)}° E</span></li>)}
        </ul>
      </details>
    </>
  )
}

/* ───────────────────────── G. charger estimator ───────────────────────── */

const CLUSTERS: [string, number, string][] = [
  ['City centre / commercial hub', 28, 'var(--green)'],
  ['Transport nagar / logistics hub', 18, 'var(--cyan)'],
  ['Industrial cluster', 16, 'var(--violet)'],
  ['Railway or bus terminal', 12, '#ffb454'],
  ['Tourist destination', 8, '#ff5d73'],
  ['Highway-adjacent zone', 18, '#4aa8ff'],
]
function allocate(total: number) {
  const raw = CLUSTERS.map(([, w]) => (w / 100) * total)
  const base = raw.map(Math.floor)
  let left = total - base.reduce((a, b) => a + b, 0)
  raw.map((r, i) => [r - base[i], i]).sort((a, b) => b[0] - a[0]).forEach(([, i]) => { if (left-- > 0) base[i]++ })
  return base
}

function EstimatorSection() {
  const [name, setName] = useState('Lucknow')
  const [target, setTarget] = useState(100)
  const [growth, setGrowth] = useState(18)
  const [years, setYears] = useState(3)
  const [hi, setHi] = useState<number | null>(null)
  const d = DISTRICTS.find((x) => x.name === name)!
  const m = metricsOf(d, target, growth, years)
  const alloc = allocate(m.addForecast)
  const bars: [string, number, string][] = [['Existing today', d.pts, 'var(--violet)'], ['Required today', m.req, 'var(--cyan)'], [`Required in ${years}y`, m.fReq, 'var(--green)']]
  const maxB = Math.max(...bars.map((b) => b[1]), 1)
  return (
    <div className="grid gap-6 xl:grid-cols-5">
      <Card title="Scenario" className="xl:col-span-2">
        <label className="block text-sm"><span className="mono-label">District</span>
          <select value={name} onChange={(e) => setName(e.target.value)} className="mt-1 w-full rounded-xl border border-line bg-[var(--surface)] px-3 py-2 text-ink">{DISTRICTS.map((x) => <option key={x.name}>{x.name}</option>)}</select>
        </label>
        <div className="mt-5 space-y-5">
          <Slider label="Target EVs per charger" value={target} min={25} max={250} step={5} onChange={setTarget} />
          <Slider label="Annual EV growth" value={growth} min={0} max={50} unit="%" onChange={setGrowth} />
          <Slider label="Forecast horizon" value={years} min={1} max={10} unit=" yrs" onChange={setYears} />
        </div>
        <div className="mt-5 grid grid-cols-2 gap-2"><Stat k="Gap Score" v={m.gap.toFixed(1)} /><Stat k="Priority" v={m.pr.label} /></div>
      </Card>
      <div className="space-y-6 xl:col-span-3">
        <Card title="Current vs forecast charger requirement">
          <ul className="space-y-3">
            {bars.map(([l, v, c]) => (
              <li key={l}>
                <div className="mb-1 flex justify-between text-sm"><span>{l}</span><b className="font-mono">{fmt(v)}</b></div>
                <div className="h-4 overflow-hidden rounded-full bg-[var(--line)]"><div className="h-full rounded-full" style={{ width: `${(v / maxB) * 100}%`, background: c, transition: 'width .6s cubic-bezier(.2,.8,.2,1)' }} /></div>
              </li>
            ))}
          </ul>
          <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-4">
            <Stat k="Additional today" v={fmt(m.addNow)} />
            <Stat k={`Forecast EVs, ${years}y`} v={fmt(m.fEv)} />
            <Stat k={`Additional by ${years}y`} v={fmt(m.addForecast)} />
            <Stat k="Coverage" v={`${Math.round(m.cov * 100)}%`} />
          </div>
          <p className="mt-3 font-mono text-[11px] leading-relaxed text-soft">Required = ceil({fmt(m.fEv)} ÷ {target}) = {fmt(m.fReq)}; Additional = max(0, {fmt(m.fReq)} − {fmt(d.pts)}) = {fmt(m.addForecast)}</p>
        </Card>
        <Card title={`Where the ${fmt(m.addForecast)} additional chargers go`}>
          <div className="flex h-8 overflow-hidden rounded-xl" role="img" aria-label="Charger allocation by location cluster">
            {CLUSTERS.map(([l, , c], i) => <div key={l} onMouseEnter={() => setHi(i)} onMouseLeave={() => setHi(null)} title={`${l}: ${alloc[i]}`} className="grid place-items-center text-[11px] font-bold text-[var(--on-green)] transition-all" style={{ width: `${(alloc[i] / Math.max(1, m.addForecast)) * 100}%`, background: c, opacity: hi === null || hi === i ? 1 : 0.4 }}>{alloc[i] > 0 && alloc[i] / Math.max(1, m.addForecast) > 0.07 ? alloc[i] : ''}</div>)}
          </div>
          <ul className="mt-4 grid gap-x-6 gap-y-2 sm:grid-cols-2">
            {CLUSTERS.map(([l, w, c], i) => (
              <li key={l} onMouseEnter={() => setHi(i)} onMouseLeave={() => setHi(null)} className="flex items-center justify-between gap-2 rounded-lg px-2 py-1 text-sm transition hover:bg-brand/5"><span className="flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-sm" style={{ background: c }} />{l}</span><span className="font-mono text-xs text-soft">{w}% · <b className="text-ink">{alloc[i]}</b></span></li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  )
}

/* ───────────────────────── H. data & scalability ───────────────────────── */

const ADAPTERS = [
  { k: 'VAHAN', via: 'Report export · CSV / API', does: 'Normalises EV registrations by fuel type, vehicle category, state/UT, district and period.' },
  { k: 'BEE', via: 'Portal · controlled ingestion', does: 'Maps public stations, operators, locations, charger counts and connector types.' },
  { k: 'OCM', via: 'REST POI API', does: 'Maps AddressInfo, OperatorInfo and Connections to the platform schema as a supplementary registry.' },
  { k: 'CPO', via: 'OCPI-style / custom REST', does: 'Reads live locations, EVSEs, connectors, power and availability per operator.' },
  { k: 'GIS', via: 'GeoJSON FeatureCollection', does: 'Loads administrative boundaries and highway geometry in EPSG:4326.' },
]
const BACK = ['Normalized Records', 'Validation', 'Spatial Join', 'Analytics', 'Dashboard']
const PHASES = [
  { n: 1, t: 'Prototype', items: ['Sample / open data', 'District-level analysis'] },
  { n: 2, t: 'State scale', items: ['VAHAN exports, BEE data', 'Verified boundaries', 'Scheduled refresh'] },
  { n: 3, t: 'National scale', items: ['Official GIS feeds, CPO / OCPI', 'PostGIS', 'Automated pipelines'] },
  { n: 4, t: 'Operational platform', items: ['Live availability, grid data', 'Role-based access', 'Forecasting'] },
]

function ScalabilitySection() {
  const [sel, setSel] = useState(0)
  const [phase, setPhase] = useState(0)
  const a = ADAPTERS[sel]
  return (
    <>
      <Card>
        <div className="flex flex-col items-stretch gap-4 lg:flex-row lg:items-center lg:gap-0">
          <ul className="space-y-3 lg:w-52" aria-label="Source adapters">
            {ADAPTERS.map((x, i) => (
              <li key={x.k}>
                <button onClick={() => setSel(i)} aria-pressed={sel === i} className={`flex h-14 w-full flex-col justify-center rounded-xl border px-3.5 text-left transition hover:translate-x-1 ${sel === i ? 'border-brand bg-brand/10 shadow-[0_0_24px_-8px_var(--glow)]' : 'border-line'}`}>
                  <span className="text-sm font-semibold">{x.k} Adapter</span><span className="text-[10px] text-soft">{x.via}</span>
                </button>
              </li>
            ))}
          </ul>
          <svg viewBox="0 0 120 328" preserveAspectRatio="none" className="hidden h-[328px] w-28 shrink-0 lg:block" aria-hidden="true">
            {ADAPTERS.map((x, i) => <path key={x.k} d={`M0 ${28 + i * 68} C 60 ${28 + i * 68}, 60 164, 120 164`} fill="none" stroke={sel === i ? 'var(--green)' : 'var(--line)'} strokeWidth={sel === i ? 2.5 : 1.5} className={sel === i ? 'animate-pulse' : ''} />)}
          </svg>
          <ol className="flex flex-1 flex-wrap items-center gap-2 lg:flex-nowrap" aria-label="Unified pipeline">
            {BACK.map((b, i) => (
              <li key={b} className="flex items-center gap-2">
                <span className={`rounded-xl border px-3 py-2.5 text-center text-xs font-semibold md:text-sm ${i === 0 ? 'text-[var(--on-green)]' : 'border-line'}`} style={i === 0 ? { background: 'linear-gradient(135deg,var(--green),var(--cyan))', boxShadow: '0 0 24px var(--glow)' } : { background: 'var(--surface)' }}>{b}</span>
                {i < BACK.length - 1 && <Icon name="arrow" size={16} className="shrink-0 text-brand" />}
              </li>
            ))}
          </ol>
        </div>
        <div className="mt-6 rounded-xl border border-line p-4" style={{ background: 'var(--surface)' }} aria-live="polite">
          <p className="mono-label text-brand">{a.k} adapter</p>
          <p key={sel} className="rise mt-1 text-sm text-soft">{a.does} Adding a new feed means writing one adapter. The analytics do not change.</p>
        </div>
      </Card>
      <Card title="Scalability roadmap">
        <ol className="grid gap-3 md:grid-cols-4">
          {PHASES.map((p, i) => (
            <li key={p.n}>
              <button onClick={() => setPhase(i)} aria-pressed={phase === i} className={`h-full w-full rounded-xl border p-4 text-left transition hover:-translate-y-0.5 ${i <= phase ? 'border-brand' : 'border-line opacity-70'}`} style={{ background: i <= phase ? 'color-mix(in srgb, var(--green) 8%, transparent)' : 'var(--surface)' }}>
                <p className="mono-label text-brand">Phase {p.n}</p><p className="font-display font-semibold">{p.t}</p>
                <ul className="mt-2 space-y-1 text-xs text-soft">{p.items.map((x) => <li key={x}>· {x}</li>)}</ul>
              </button>
            </li>
          ))}
        </ol>
      </Card>
    </>
  )
}

/* ───────────────────────── page ───────────────────────── */

export default function Methodology({ onBack }: { onBack: () => void }) {
  const [active, setActive] = useState(SECTIONS[0].id)
  const [menu, setMenu] = useState(false)
  useEffect(() => {
    if (!menu) return
    const k = (e: KeyboardEvent) => e.key === 'Escape' && setMenu(false)
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [menu])
  const sc = useScenario()

  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [])

  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        const vis = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        if (vis[0]) setActive(vis[0].target.id.replace('m-', ''))
      },
      { rootMargin: '-90px 0px -65% 0px' },
    )
    SECTIONS.forEach((s) => {
      const el = document.getElementById(`m-${s.id}`)
      if (el) obs.observe(el)
    })
    return () => obs.disconnect()
  }, [])

  const jump = (id: string) => document.getElementById(`m-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })

  return (
    <div className="px-5 pb-24 pt-28 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-[1320px]">
        <button onClick={onBack} className="hover-glow mb-6 inline-flex items-center gap-2 rounded-xl border border-line px-3.5 py-2 text-sm text-soft">
          <Icon name="arrow" size={16} className="rotate-180" />Back to overview
        </button>

        <header className="relative overflow-hidden rounded-3xl border border-line p-6 sm:p-8 lg:p-12" style={{ background: 'linear-gradient(135deg, color-mix(in srgb,var(--green) 12%, transparent), transparent 55%), linear-gradient(315deg, color-mix(in srgb,var(--violet) 16%, transparent), transparent 55%)' }}>
          <p className="mono-label mb-3 text-brand">Module 02 · Methodology</p>
          <h1 className="max-w-4xl text-3xl font-bold leading-[1.1] sm:text-4xl lg:text-5xl">How raw registrations and charger feeds become a <span className="text-grad">Gap Score</span></h1>
          <p className="mt-4 max-w-3xl leading-relaxed text-soft">An interactive walk through data cleaning, multi-source integration, Gap Score calculation and forecasting, followed by the decision dashboard, GIS map, charger estimator and data architecture. Every figure below recalculates as you change an input.</p>
          <div className="mt-6 flex flex-wrap gap-2">
            {SECTIONS.map((s) => (
              <button key={s.id} onClick={() => jump(s.id)} className="hover-glow rounded-xl border border-line px-3.5 py-2 text-sm font-medium">
                <span className="mr-2 font-mono text-xs text-brand">{s.letter}</span>{s.label}
              </button>
            ))}
          </div>
        </header>

        <div className="sticky top-20 z-20 mt-6 flex justify-end">
          <button onClick={() => setMenu(true)} aria-haspopup="dialog" aria-expanded={menu} className="glass hover-glow inline-flex items-center gap-2.5 rounded-full border border-line px-4 py-2.5 text-sm font-medium" style={{ background: 'var(--surface-strong)' }}>
            <Icon name="doc" size={16} className="text-brand" />Sections<span className="font-mono text-xs text-soft">{SECTIONS.find((x) => x.id === active)?.letter}/{SECTIONS.length}</span>
          </button>
        </div>
        {menu && createPortal(
          <div className="meth-menu-bg" onMouseDown={() => setMenu(false)}>
            <div className="meth-menu glass" role="dialog" aria-modal="true" aria-label="Jump to section" onMouseDown={(e) => e.stopPropagation()}>
              <button className="meth-menu-x" onClick={() => setMenu(false)} aria-label="Close sections panel" title="Close (Esc)"><Icon name="close" size={20} /></button>
              <p className="mono-label text-brand">Navigate</p>
              <h2>Jump to a section</h2>
              <ol>
                {SECTIONS.map((s) => (
                  <li key={s.id}>
                    <button onClick={() => { setMenu(false); setTimeout(() => jump(s.id), 60) }} aria-current={active === s.id ? 'true' : undefined} className={active === s.id ? 'on' : ''}>
                      <span>{s.letter}</span>{s.label}<Icon name="arrow" size={15} />
                    </button>
                  </li>
                ))}
              </ol>
            </div>
          </div>,
          document.body,
        )}

        <div className="mt-10 grid gap-10">
          <div className="min-w-0 space-y-14">
            <Section id="cleaning" letter="A" title="Data cleaning" lead="Raw data from five source families is validated, standardised, geocoded, deduplicated and spatially joined before any metric is calculated. Problems are flagged and kept, not deleted.">
              <CleaningFlow />
              <div className="grid gap-6 lg:grid-cols-2">
                <Card title="What gets standardised">
                  <ul className="grid gap-2 sm:grid-cols-2">
                    {STANDARDISED.map((x) => <li key={x} className="flex items-center gap-2 text-sm text-soft"><Icon name="check" size={16} className="shrink-0 text-brand" />{x}</li>)}
                  </ul>
                </Card>
                <Card title="Duplicate charger detection">
                  <p className="text-sm text-soft">BEE, Open Charge Map and CPO records overlap. Five signals are combined:</p>
                  <ul className="mt-3 flex flex-wrap gap-2">{DEDUPE.map((d, i) => <li key={d} className="flex items-center gap-2 rounded-lg border border-line px-3 py-1.5 text-xs"><span className="font-mono text-brand">{i + 1}</span>{d}</li>)}</ul>
                </Card>
              </div>
              <div className="grid gap-6 lg:grid-cols-2">
                <CoordChecker />
                <Card title="Data-quality flags">
                  <ul className="space-y-2.5">
                    {FLAGS.map(([f, d, c]) => (
                      <li key={f} className="grid items-center gap-1 sm:grid-cols-[190px_1fr] sm:gap-3"><span><Chip color={c}>{f}</Chip></span><span className="text-xs text-soft">{d}</span></li>
                    ))}
                  </ul>
                </Card>
              </div>
            </Section>

            <Section id="integration" letter="B" title="Data integration" lead="Five feeds with different shapes converge into one unified EV-charger dataset. Chargers are spatially joined to districts and highways, then scored. Select a source to see what it contributes.">
              <IntegrationFlow />
            </Section>

            <Section id="gap" letter="C" title="Gap Score" lead="A transparent 0–100 score. Higher means a larger mismatch between EV demand and public charging supply. Every term is visible and every weight is configurable.">
              <GapExplainer sc={sc} />
            </Section>

            <Section id="forecast" letter="D" title="Forecasting method" lead="A compound-growth model projects the EV population, then converts it into required and additional charging points, so planners can size the build-out, not just rank it.">
              <ForecastLab sc={sc} />
            </Section>

            <Section id="corridor" letter="E" title="Highway corridor & validation" lead="Highways are sampled every 25 km inside a 5 km buffer to find uncovered stretches, then every dataset passes a six-step quality-assurance workflow before it informs a decision.">
              <CorridorValidation sc={sc} />
            </Section>

            <Section id="dashboard" letter="F" title="Decision dashboard" lead="The Gap Score is the centrepiece: hover a term to isolate it, pick a district in the ranking to see its gauge, contributions and plain-language explanation.">
              <DashboardSection />
            </Section>

            <Section id="map" letter="G" title="National GIS map" lead="Choropleth districts, clustered chargers and illuminated highways for the Uttar Pradesh prototype. Click anywhere to drop a pin and open the drill-down.">
              <GisMapSection />
            </Section>

            <Section id="estimator" letter="H" title="Charger estimator" lead="Compare today’s requirement with the forecast, then see how the additional chargers split across location clusters.">
              <EstimatorSection />
            </Section>

            <Section id="scale" letter="I" title="Data & scalability" lead="Five source adapters feed one unified pipeline, so the platform scales from a state prototype to a national system without rework.">
              <ScalabilitySection />
            </Section>
          </div>
        </div>
      </div>
    </div>
  )
}
