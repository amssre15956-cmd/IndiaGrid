import { useMemo, useState } from 'react'
import { CountUp } from './Charts'
import { Icon } from './icons'

type Mode = 'State' | 'District' | 'National Highway' | 'State Highway'

const PLACES = {
  State: { label: 'Uttar Pradesh', code: 'UP', evs: 286400, chargers: 2175, coverage: 38, gap: 72, fast: 604 },
  District: { label: 'Lucknow', code: 'UP-32', evs: 34280, chargers: 186, coverage: 31, gap: 81, fast: 62 },
  'National Highway': { label: 'NH-27 · Lucknow–Ayodhya corridor', code: 'NH-27', evs: 0, chargers: 14, coverage: 43, gap: 74, fast: 9, length: 157 },
  'State Highway': { label: 'SH-25 · Lucknow–Hardoi corridor', code: 'SH-25', evs: 0, chargers: 7, coverage: 32, gap: 77, fast: 4, length: 114 },
} as const

const DISTRICTS = ['Lucknow', 'Kanpur Nagar', 'Gautam Buddha Nagar', 'Varanasi', 'Agra']
const HIGHWAYS = ['NH-19 · Agra–Kanpur', 'NH-27 · Lucknow–Ayodhya corridor', 'NH-44 · Jhansi corridor', 'NH-24 · Ghaziabad corridor']
const ALLOCATIONS = [
  ['City center / commercial hub', 40, 94, 'High commercial activity and public transport demand'],
  ['Transport nagar / logistics hub', 22, 88, 'Freight movement and fleet dwell time'],
  ['Industrial cluster', 13, 79, 'Predictable shift-based charging demand'],
  ['Railway station / bus terminal', 10, 76, 'High footfall and multimodal interchange'],
  ['Hospital / institutional zone', 7, 68, 'Essential-trip and institutional demand'],
  ['Highway-adjacent zone', 8, 82, 'Corridor continuity and intercity travel'],
] as const

const fmt = (n: number) => Math.round(n).toLocaleString('en-IN')

export default function Estimator({ onBack }: { onBack: () => void }) {
  const [mode, setMode] = useState<Mode>('District')
  const [district, setDistrict] = useState('Lucknow')
  const [highway, setHighway] = useState(HIGHWAYS[1])
  const [target, setTarget] = useState(100)
  const [years, setYears] = useState(3)
  const [growth, setGrowth] = useState(18)
  const [vehicle, setVehicle] = useState('All EVs')
  const [corridor, setCorridor] = useState(true)
  const [buffer, setBuffer] = useState(5)
  const [spacing, setSpacing] = useState(25)
  const [compare, setCompare] = useState(false)
  const [assistantOpen, setAssistantOpen] = useState(false)

  const base = PLACES[mode]
  const isHighway = mode.includes('Highway')
  const label = mode === 'District' ? district : isHighway ? highway : base.label
  const baseEVs = isHighway ? 0 : base.evs * (vehicle === 'All EVs' ? 1 : vehicle === 'Two-wheelers' ? 0.56 : vehicle === 'Three-wheelers' ? 0.2 : vehicle === 'Four-wheelers' ? 0.18 : 0.06)
  const existing = base.chargers
  const neededToday = isHighway ? Math.ceil((base.length || 0) / spacing) : Math.ceil(baseEVs / target)
  const forecastEvs = baseEVs * Math.pow(1 + growth / 100, years)
  const forecastNeed = isHighway ? neededToday : Math.ceil(forecastEvs / target)
  const addToday = Math.max(0, neededToday - existing)
  const addForecast = Math.max(0, forecastNeed - existing)
  const coverage = Math.min(100, Math.round((existing / Math.max(neededToday, 1)) * 100))
  const allocationTotal = Math.max(addForecast, 1)
  const placeTitle = mode === 'District' ? `${district}, Uttar Pradesh` : label

  const segments = useMemo(() => {
    const length = base.length || 157
    return Array.from({ length: Math.ceil(length / spacing) }, (_, i) => {
      const start = i * spacing
      const end = Math.min(length, (i + 1) * spacing)
      const covered = [0, 2, 4].includes(i)
      return { start, end, covered, nearest: covered ? 9 + i * 3 : 31 + i * 4 }
    })
  }, [base.length, spacing])

  const reset = () => { setTarget(100); setYears(3); setGrowth(18); setVehicle('All EVs'); setCorridor(true); setBuffer(5); setSpacing(25); setCompare(false) }

  return (
    <section className="relative px-4 pb-20 pt-24 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-[1500px]">
        <div className="mb-8 flex flex-col justify-between gap-5 xl:flex-row xl:items-end">
          <div>
            <button onClick={onBack} className="mb-5 inline-flex items-center gap-2 font-mono text-xs text-soft transition hover:text-brand"><span className="rotate-180"><Icon name="arrow" size={14} /></span>Platform / Chargers Estimation</button>
            <p className="mono-label text-brand">Planning intelligence / scenario modeller</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Charger Requirement <span className="text-grad">Estimator</span></h1>
            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-soft sm:text-base">Estimate public EV charging-point requirements and prioritize locations across states, districts, and highway corridors.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <p className="rounded-full border border-line bg-[var(--surface)] px-3 py-2 font-mono text-[10px] text-soft">POWERED BY VAHAN · BEE EV YATRA · OCM · CPO APIs · GOV GIS</p>
            <button className="btn-ghost inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm"><Icon name="doc" size={16} />Download recommendation</button>
            <button onClick={reset} className="rounded-xl border border-line px-4 py-2.5 text-sm text-soft transition hover:border-violet hover:text-ink">Reset scenario</button>
          </div>
        </div>

        <div className="grid gap-5 xl:grid-cols-12">
          <div className="space-y-5 xl:col-span-4">
            <section className="glass rounded-3xl p-5">
              <div className="flex items-center justify-between"><div><p className="mono-label">01 / Geography</p><h2 className="mt-1 text-lg font-semibold">Select Planning Geography</h2></div><span className="grid h-9 w-9 place-items-center rounded-xl border border-brand/40 bg-brand/10 text-brand"><Icon name="map" size={18} /></span></div>
              <div className="mt-5 grid grid-cols-2 gap-2">
                {(Object.keys(PLACES) as Mode[]).map((m) => <button key={m} onClick={() => setMode(m)} className={`rounded-xl border px-3 py-3 text-left text-xs font-medium transition ${mode === m ? 'border-brand bg-brand/10 text-brand shadow-[0_0_20px_-8px_var(--glow)]' : 'border-line text-soft hover:border-cyan'}`}>{m}</button>)}
              </div>
              <div className="mt-5 space-y-3">
                <Field label="State"><select defaultValue="Uttar Pradesh" className="est-select"><option>Uttar Pradesh</option><option>Maharashtra</option><option>Karnataka</option></select></Field>
                {mode === 'District' && <Field label="District"><select value={district} onChange={e => setDistrict(e.target.value)} className="est-select">{DISTRICTS.map(d => <option key={d}>{d}</option>)}</select></Field>}
                {isHighway && <Field label={mode === 'National Highway' ? 'National highway' : 'State highway'}><select value={highway} onChange={e => setHighway(e.target.value)} className="est-select">{HIGHWAYS.map(h => <option key={h}>{mode === 'State Highway' ? h.replace('NH-', 'SH-') : h}</option>)}</select></Field>}
              </div>
              <div className="mt-5 grid grid-cols-3 gap-2 border-t border-line pt-4 text-center">
                <MiniStat label={isHighway ? 'Length' : 'EV population'} value={isHighway ? `${base.length} km` : fmt(baseEVs)} />
                <MiniStat label="Existing points" value={fmt(existing)} />
                <MiniStat label="Gap score" value={`${base.gap}/100`} tone="violet" />
              </div>
            </section>

            <section className="glass rounded-3xl p-5">
              <div className="flex items-center justify-between"><div><p className="mono-label">02 / Parameters</p><h2 className="mt-1 text-lg font-semibold">Planning Scenario</h2></div><span className="font-mono text-xs text-brand">LIVE</span></div>
              <div className="mt-5 space-y-4">
                <Range label="Target EVs per public point" value={target} min={25} max={250} unit="" onChange={setTarget} />
                <Range label="Forecast horizon" value={years} min={1} max={10} unit=" yrs" onChange={setYears} />
                <Range label="Annual EV growth rate" value={growth} min={0} max={50} unit="%" onChange={setGrowth} />
                <Field label="Vehicle-category focus"><select value={vehicle} onChange={e => setVehicle(e.target.value)} className="est-select">{['All EVs', 'Two-wheelers', 'Three-wheelers', 'Four-wheelers', 'Buses', 'Goods vehicles'].map(v => <option key={v}>{v}</option>)}</select></Field>
                <label className="flex cursor-pointer items-center justify-between rounded-xl border border-line bg-[var(--surface)] px-3 py-3 text-sm"><span>Include highway-corridor analysis</span><input type="checkbox" checked={corridor} onChange={e => setCorridor(e.target.checked)} className="h-4 w-4 accent-[var(--green)]" /></label>
                {corridor && <div className="grid grid-cols-2 gap-3"><Range label="Buffer distance" value={buffer} min={1} max={10} unit=" km" onChange={setBuffer} /><Range label="Charger spacing" value={spacing} min={10} max={50} unit=" km" onChange={setSpacing} /></div>}
              </div>
            </section>
          </div>

          <div className="space-y-5 xl:col-span-8">
            <section className="glass relative min-h-[292px] overflow-hidden rounded-3xl p-5 sm:p-6">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_80%_0%,color-mix(in_srgb,var(--cyan)_14%,transparent),transparent_58%)]" />
              <div className="relative z-10 flex items-start justify-between"><div><p className="mono-label">Live geography preview</p><h2 className="mt-1 text-xl font-semibold">{placeTitle}</h2><p className="mt-1 text-xs text-soft">{isHighway ? `${mode} · ${base.length} km · ${buffer} km corridor buffer` : `${mode} boundary · selected for planning model`}</p></div><span className="rounded-full border border-brand/40 bg-brand/10 px-3 py-1 font-mono text-[10px] text-brand">SELECTED</span></div>
              <GeoMap mode={mode} district={district} highway={highway} />
            </section>

            <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <KPI label={isHighway ? 'Corridor length' : 'Current EV population'} value={isHighway ? `${base.length} km` : fmt(baseEVs)} note={isHighway ? 'Selected route' : 'VAHAN registered EVs'} />
              <KPI label="Existing public points" value={fmt(existing)} note={`${base.fast} fast-charging points`} />
              <KPI label="Required points today" value={fmt(neededToday)} note={`${target} EVs per point target`} />
              <KPI hot label="Additional required today" value={fmt(addToday)} note={addToday ? 'Priority supply gap' : 'Current target met'} />
              <KPI label={isHighway ? 'Covered route samples' : 'Forecast EV population'} value={isHighway ? `${coverage}%` : fmt(forecastEvs)} note={isHighway ? 'at selected spacing' : `${growth}% CAGR · ${years} years`} />
              <KPI hot violet label="Additional by forecast horizon" value={fmt(addForecast)} note={`${years}-year planning requirement`} />
            </section>
          </div>
        </div>

        <section className="glass mt-5 rounded-3xl p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="mono-label">Calculation trace</p><h2 className="mt-1 text-lg font-semibold">Transparent requirement formula</h2></div><p className="rounded-lg bg-brand/10 px-3 py-2 font-mono text-xs text-brand">Scenario updates instantly</p></div>
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <Formula n="01" title="Forecast EVs" equation={`Current EVs × (1 + ${growth}%)${years}`} result={isHighway ? 'Corridor model' : fmt(forecastEvs)} />
            <Formula n="02" title="Required chargers" equation={`ceil(Forecast EVs / ${target})`} result={fmt(forecastNeed)} />
            <Formula n="03" title="Additional chargers" equation="max(0, Required − Existing)" result={fmt(addForecast)} hot />
          </div>
        </section>

        {isHighway ? <CorridorView segments={segments} length={base.length || 0} spacing={spacing} existing={existing} add={addToday} coverage={coverage} code={mode === 'State Highway' ? 'SH-25' : 'NH-27'} /> : <DistrictView label={placeTitle} code={base.code} existing={existing} required={neededToday} future={forecastNeed} add={addToday} futureAdd={addForecast} coverage={coverage} gap={base.gap} />}

        <section className="mt-5 grid gap-5 xl:grid-cols-12">
          <div className="glass rounded-3xl p-5 sm:p-6 xl:col-span-8">
            <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="mono-label">Location allocation</p><h2 className="mt-1 text-xl font-semibold">Where Should Chargers Be Installed?</h2></div><p className="font-mono text-xs text-brand">{fmt(addForecast)} points to allocate</p></div>
            <div className="mt-6 flex h-4 overflow-hidden rounded-full bg-[var(--line)]">{ALLOCATIONS.map(([name, share], i) => <span key={name} title={`${name}: ${share}%`} className="h-full border-r border-[var(--bg)] transition-all duration-700" style={{ width: `${share}%`, background: [`var(--cyan)`, `var(--green)`, `var(--violet)`, `#e2b54b`, `#ed748f`, `#4f80eb`][i] }} />)}</div>
            <div className="mt-6 grid gap-3 md:grid-cols-2">
              {ALLOCATIONS.map(([name, share, score, reason], i) => <div key={name} className="rounded-2xl border border-line bg-[var(--surface)] p-4"><div className="flex justify-between gap-3"><h3 className="text-sm font-semibold">{name}</h3><span className="font-mono text-xs text-brand">{score}/100</span></div><p className="mt-1 text-xs text-soft">{reason}</p><div className="mt-3 flex items-center justify-between text-xs"><span className="font-mono text-soft">{share}% share</span><strong className="text-ink">{fmt(allocationTotal * share / 100)} points</strong></div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--line)]"><div className="h-full rounded-full" style={{ width: `${share}%`, background: [`var(--cyan)`, `var(--green)`, `var(--violet)`, '#e2b54b', '#ed748f', '#4f80eb'][i] }} /></div></div>)}
            </div>
          </div>
          <div className="glass rounded-3xl p-5 xl:col-span-4"><p className="mono-label">Priority score model</p><h2 className="mt-1 text-lg font-semibold">Location Priority Score</h2><p className="mt-4 font-mono text-xs leading-6 text-soft">0.30 N(EV demand)<br />+ 0.20 N(Population density)<br />+ 0.15 N(Commercial activity)<br />+ 0.15 N(Logistics activity)<br />+ 0.10 N(Tourism opportunity)<br />+ 0.10 N(Grid feasibility)</p><div className="mt-5 space-y-2">{[['EV demand', 92], ['Population density', 78], ['Commercial activity', 86], ['Grid feasibility', 71]].map(([n, v]) => <div key={String(n)}><div className="flex justify-between text-[11px] text-soft"><span>{n}</span><span>{v}</span></div><div className="mt-1 h-1.5 rounded-full bg-[var(--line)]"><div className="h-full rounded-full bg-gradient-to-r from-cyan to-violet" style={{ width: `${v}%` }} /></div></div>)}</div></div>
        </section>

        <section className="glass mt-5 rounded-3xl p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-4"><div><p className="mono-label">Planning comparison</p><h2 className="mt-1 text-xl font-semibold">Compare Geographies</h2></div><label className="flex items-center gap-3 rounded-full border border-line px-3 py-2 text-sm">Enable comparison<input type="checkbox" checked={compare} onChange={e => setCompare(e.target.checked)} className="h-4 w-4 accent-[var(--green)]" /></label></div>
          {compare ? <Comparison /> : <p className="mt-5 rounded-2xl border border-dashed border-line p-5 text-sm text-soft">Enable comparison to evaluate up to three districts or highway corridors against the active planning scenario.</p>}
        </section>
      </div>

      <aside className={`fixed bottom-5 right-5 z-30 w-[min(360px,calc(100vw-2.5rem))] overflow-hidden rounded-3xl border border-brand/40 bg-[color-mix(in_srgb,var(--surface-strong)_94%,var(--bg))] shadow-[0_20px_60px_-15px_var(--glow)] backdrop-blur-xl transition-all ${assistantOpen ? '' : 'max-h-[64px]'}`}>
        <button onClick={() => setAssistantOpen(v => !v)} className="flex w-full items-center gap-3 p-4 text-left"><span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-brand to-cyan text-[var(--on-green)]"><Icon name="spark" size={18} /></span><span className="flex-1"><span className="block text-sm font-semibold">AI planning assistant</span><span className="block text-[11px] text-soft">Ask for a recommendation</span></span><Icon name="chevron" size={16} className={`transition ${assistantOpen ? 'rotate-180' : ''}`} /></button>
        {assistantOpen && <div className="border-t border-line px-4 pb-4 pt-3"><p className="text-sm text-soft">I can explain the scenario or surface the highest-priority sites.</p><div className="mt-3 flex flex-wrap gap-2">{['Which district needs the most chargers?', 'Estimate Lucknow by 2029', 'Find uncovered segments on NH-44'].map(p => <button key={p} className="rounded-lg border border-line px-2.5 py-2 text-left text-[11px] text-soft transition hover:border-brand hover:text-brand">{p}</button>)}</div></div>}
      </aside>
    </section>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block"><span className="mb-1.5 block text-[11px] font-medium text-soft">{label}</span>{children}</label> }
function Range({ label, value, min, max, unit, onChange }: { label: string; value: number; min: number; max: number; unit: string; onChange: (v: number) => void }) { return <label className="block"><span className="flex justify-between text-[11px] text-soft"><span>{label}</span><b className="font-mono text-brand">{value}{unit}</b></span><input aria-label={label} type="range" min={min} max={max} value={value} onChange={e => onChange(+e.target.value)} className="est-range mt-2 w-full" /></label> }
function MiniStat({ label, value, tone }: { label: string; value: string; tone?: string }) { return <div><p className="font-mono text-[9px] uppercase tracking-wide text-soft">{label}</p><p className={`mt-1 text-sm font-semibold ${tone === 'violet' ? 'text-violet' : ''}`}>{value}</p></div> }
function KPI({ label, value, note, hot, violet }: { label: string; value: string; note: string; hot?: boolean; violet?: boolean }) { return <article className={`relative overflow-hidden rounded-2xl border p-4 ${hot ? violet ? 'border-violet/70 bg-violet/10 shadow-[0_0_26px_-12px_var(--violet)]' : 'border-brand/70 bg-brand/10 shadow-[0_0_26px_-12px_var(--glow)]' : 'border-line bg-[var(--surface)]'}`}><p className="mono-label !text-[9px]">{label}</p><p className={`mt-2 font-display text-2xl font-bold ${hot ? violet ? 'text-violet' : 'text-brand' : ''}`}><CountUp to={parseInt(value.replace(/[^\d]/g, '') || '0')} />{value.includes('km') ? ' km' : value.includes('%') ? '%' : ''}</p><p className="mt-1 text-[11px] text-soft">{note}</p></article> }
function Formula({ n, title, equation, result, hot }: { n: string; title: string; equation: string; result: string; hot?: boolean }) { return <div className={`rounded-2xl border p-4 ${hot ? 'border-brand/50 bg-brand/10' : 'border-line bg-[var(--surface)]'}`}><p className="font-mono text-[10px] text-soft">{n} / {title}</p><p className="mt-3 font-mono text-xs text-soft">{equation}</p><p className={`mt-2 text-xl font-semibold ${hot ? 'text-brand' : ''}`}>{result}</p></div> }

const CITIES: Record<string, { lat: number; lon: number }> = {
  Lucknow: { lat: 26.8467, lon: 80.9462 },
  'Kanpur Nagar': { lat: 26.4499, lon: 80.3319 },
  Varanasi: { lat: 25.3176, lon: 82.9739 },
  Agra: { lat: 27.1767, lon: 78.0081 },
  'Gautam Buddha Nagar': { lat: 28.5355, lon: 77.391 },
}
const CORRIDORS: Record<string, { from: string; to: string; a: [number, number]; b: [number, number]; via: string }> = {
  '19': { from: 'Agra', to: 'Kanpur', a: [27.1767, 78.0081], b: [26.4499, 80.3319], via: 'Firozabad · Etawah' },
  '27': { from: 'Lucknow', to: 'Ayodhya', a: [26.8467, 80.9462], b: [26.7922, 82.1998], via: 'Barabanki · Faizabad' },
  '44': { from: 'Jhansi', to: 'Kanpur', a: [25.4484, 78.5685], b: [26.4499, 80.3319], via: 'Orai · Kalpi' },
  '24': { from: 'Ghaziabad', to: 'Lucknow', a: [28.6692, 77.4538], b: [26.8467, 80.9462], via: 'Moradabad · Bareilly' },
}
const dms = (v: number, p: string, n: string) => `${Math.abs(v).toFixed(4)}° ${v >= 0 ? p : n}`
const proj = (lat: number, lon: number) => ({ x: 30 + ((lon - 76.8) / (84.2 - 76.8)) * 300, y: 20 + ((29.2 - lat) / (29.2 - 24.6)) * 190 })

function GeoMap({ mode, district, highway }: { mode: Mode; district: string; highway: string }) {
  const isHw = mode.includes('Highway')
  const prefix = mode === 'State Highway' ? 'SH' : 'NH'
  const corridor = CORRIDORS[(highway.match(/\d+/) || ['27'])[0]] || CORRIDORS['27']
  const c = CITIES[district] || CITIES.Lucknow
  const src = isHw
    ? `https://maps.google.com/maps?saddr=${corridor.a.join(',')}&daddr=${corridor.b.join(',')}&t=k&hl=en&output=embed`
    : mode === 'State' ? `https://maps.google.com/maps?q=26.8467,80.9462&t=k&z=6&hl=en&output=embed` : `https://maps.google.com/maps?q=${c.lat},${c.lon}&t=k&z=11&hl=en&output=embed`
  const pts = Object.entries(CITIES).map(([n, p]) => ({ n, ...p, ...proj(p.lat, p.lon) }))
  const ca = proj(...corridor.a), cb = proj(...corridor.b)
  return <div className="relative z-10 mt-4 grid gap-4 lg:grid-cols-5">
    <div className="relative overflow-hidden rounded-2xl border border-line bg-black lg:col-span-3">
      <iframe key={src} title="Satellite preview" src={src} loading="lazy" referrerPolicy="no-referrer-when-downgrade" className="block h-[300px] w-full border-0" />
      <span className="pointer-events-none absolute left-3 top-3 rounded-md bg-black/70 px-2 py-1 font-mono text-[10px] text-cyan backdrop-blur">SATELLITE · {isHw ? `${prefix}-${(highway.match(/\d+/) || ['27'])[0]} · ${corridor.from}–${corridor.to}` : `${mode === 'State' ? 'Uttar Pradesh' : district}`}</span>
      <span className="pointer-events-none absolute bottom-3 left-3 rounded-md bg-black/70 px-2 py-1 font-mono text-[10px] text-white backdrop-blur">{isHw ? `${dms(corridor.a[0], 'N', 'S')}, ${dms(corridor.a[1], 'E', 'W')} → ${dms(corridor.b[0], 'N', 'S')}, ${dms(corridor.b[1], 'E', 'W')}` : `${dms(c.lat, 'N', 'S')}, ${dms(c.lon, 'E', 'W')}`}</span>
    </div>
    <div className="rounded-2xl border border-line bg-[var(--surface)] p-3 lg:col-span-2">
      <svg viewBox="0 0 360 230" className="h-[200px] w-full" aria-label="Latitude and longitude plot of planning cities">
        {Array.from({ length: 5 }).map((_, i) => <g key={i}><line x1={30} x2={330} y1={20 + i * 47.5} y2={20 + i * 47.5} stroke="var(--line)" strokeWidth=".6" /><text x={2} y={23 + i * 47.5} fill="var(--text-soft)" fontSize="7" fontFamily="var(--font-mono)">{(29.2 - i * 1.15).toFixed(1)}°N</text></g>)}
        {Array.from({ length: 5 }).map((_, i) => <g key={i}><line y1={20} y2={210} x1={30 + i * 75} x2={30 + i * 75} stroke="var(--line)" strokeWidth=".6" /><text y={224} x={22 + i * 75} fill="var(--text-soft)" fontSize="7" fontFamily="var(--font-mono)">{(76.8 + i * 1.85).toFixed(1)}°E</text></g>)}
        {isHw && <><line x1={ca.x} y1={ca.y} x2={cb.x} y2={cb.y} stroke="var(--violet)" strokeWidth="5" opacity=".3" /><line x1={ca.x} y1={ca.y} x2={cb.x} y2={cb.y} stroke="var(--cyan)" strokeWidth="2" strokeDasharray="5 5" />{[ca, cb].map((p, i) => <circle key={i} cx={p.x} cy={p.y} r="4" fill="var(--violet)" />)}</>}
        {pts.map(p => { const sel = !isHw && mode === 'District' && p.n === district; return <g key={p.n}>{sel && <circle cx={p.x} cy={p.y} r="14" fill="none" stroke="var(--cyan)" opacity=".7" className="pulse-ring" />}<circle cx={p.x} cy={p.y} r={sel ? 6 : 4} fill={sel ? 'var(--brand)' : 'var(--cyan)'} stroke="var(--bg)" strokeWidth="1.5" /><text x={p.x + 8} y={p.y + 3} fill={sel ? 'var(--text)' : 'var(--text-soft)'} fontSize="8.5" fontWeight={sel ? 700 : 400}>{p.n.replace(' Nagar', '')}</text></g> })}
      </svg>
      <div className="mt-1 grid gap-0.5 font-mono text-[9px] text-soft">{pts.map(p => <div key={p.n} className={`flex justify-between ${!isHw && p.n === district ? 'text-brand' : ''}`}><span>{p.n}</span><span>{p.lat.toFixed(4)}°N · {p.lon.toFixed(4)}°E</span></div>)}</div>
      {isHw && <p className="mt-2 border-t border-line pt-2 text-[10px] text-soft">{prefix}-{(highway.match(/\d+/) || ['27'])[0]} via {corridor.via}</p>}
    </div>
  </div>
}

function DistrictView({ label, code, existing, required, future, add, futureAdd, coverage, gap }: { label: string; code: string; existing: number; required: number; future: number; add: number; futureAdd: number; coverage: number; gap: number }) {
  const max = Math.max(existing, required, future)
  return <section className="mt-5 grid gap-5 xl:grid-cols-12"><div className="glass rounded-3xl p-5 sm:p-6 xl:col-span-7"><p className="mono-label">District estimation view</p><div className="mt-1 flex items-end justify-between gap-3"><h2 className="text-xl font-semibold">{label}</h2><span className="font-mono text-xs text-soft">{code}</span></div><div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">{[['2W', '19,200'], ['3W', '6,860'], ['4W', '6,110'], ['Bus / goods', '2,110']].map(([a,b]) => <MiniStat key={a} label={a} value={b} />)}</div><div className="mt-7 flex h-48 items-end justify-around gap-5 border-b border-line px-4">{[['Existing', existing, 'var(--green)'], ['Today', required, 'var(--cyan)'], [`${new Date().getFullYear()+3}`, future, 'var(--violet)']].map(([n, v, c]) => <div key={String(n)} className="flex h-full flex-1 flex-col justify-end text-center"><span className="mb-2 font-mono text-xs">{fmt(Number(v))}</span><div className="rounded-t-xl transition-all duration-700" style={{ height: `${Math.max(9, Number(v) / max * 100)}%`, background: String(c), boxShadow: `0 0 18px -4px ${c}` }} /><span className="mt-2 text-[10px] text-soft">{n}</span></div>)}</div><p className="mt-5 text-xs text-soft">Charging-point requirement: existing supply vs. today’s target vs. forecast demand.</p></div><div className="glass rounded-3xl p-5 xl:col-span-5"><p className="mono-label">Coverage & priority</p><div className="mt-5 flex items-center gap-6"><Gauge value={coverage} label="Coverage" color="var(--cyan)" /><Gauge value={gap} label="Gap Score" color="var(--violet)" /></div><div className="mt-5 grid grid-cols-2 gap-3 border-t border-line pt-4"><MiniStat label="Additional today" value={fmt(add)} /><MiniStat label="Forecast additional" value={fmt(futureAdd)} tone="violet" /></div><p className="mt-4 inline-flex rounded-full border border-red-400/40 bg-red-400/10 px-3 py-1 font-mono text-[10px] text-red-300">CRITICAL PRIORITY · supply deficit</p></div></section>
}
function Gauge({ value, label, color }: { value: number; label: string; color: string }) { return <div className="relative grid h-28 w-28 place-items-center rounded-full" style={{ background: `conic-gradient(${color} ${value * 3.6}deg, var(--line) 0deg)` }}><div className="grid h-[86px] w-[86px] place-items-center rounded-full bg-[var(--bg)]"><div className="text-center"><p className="font-display text-xl font-bold">{value}%</p><p className="text-[10px] text-soft">{label}</p></div></div></div> }

function CorridorView({ segments, length, spacing, existing, add, coverage, code }: { segments: { start: number; end: number; covered: boolean; nearest: number }[]; length: number; spacing: number; existing: number; add: number; coverage: number; code: string }) { return <section className="glass mt-5 rounded-3xl p-5 sm:p-6"><div className="flex flex-wrap items-end justify-between gap-3"><div><p className="mono-label">Highway corridor estimation</p><h2 className="mt-1 text-xl font-semibold">{code} / {length} km corridor</h2><p className="mt-1 text-xs text-soft">{spacing} km spacing target · {existing} existing corridor chargers · {add} recommended additions</p></div><Gauge value={coverage} label="Corridor coverage" color="var(--green)" /></div><div className="mt-7 rounded-2xl border border-line bg-[var(--surface)] p-5"><div className="flex items-center gap-1">{segments.map((s, i) => <div key={i} className={`relative h-5 flex-1 rounded-sm ${s.covered ? 'bg-brand' : 'bg-red-400/75'}`} title={s.covered ? `Covered: ${s.start}–${s.end} km` : `Uncovered segment: ${s.start}–${s.end} km. Nearest charger: ${s.nearest} km away.`}>{(i === 0 || i === 2 || i === 4) && <span className="absolute -top-4 left-1/2 h-3 w-3 -translate-x-1/2 rounded-full border-2 border-[var(--bg)] bg-cyan shadow-[0_0_12px_var(--cyan)]" />}{!s.covered && <span className="pulse-glow absolute -bottom-4 left-1/2 h-3 w-3 -translate-x-1/2 rounded-full bg-violet" />}</div>)}</div><div className="mt-6 flex justify-between font-mono text-[10px] text-soft"><span>0 km</span><span>{length} km</span></div><div className="mt-4 flex flex-wrap gap-4 text-[11px] text-soft"><span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-brand" />Covered segment</span><span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-red-400" />Uncovered segment</span><span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-violet" />Recommended point</span></div></div><div className="mt-6 overflow-x-auto"><table className="w-full min-w-[650px] text-left text-xs"><thead className="border-b border-line font-mono text-[10px] uppercase text-soft"><tr>{['Segment', 'Length', 'Nearest charger', 'Gap status', 'Recommended action', 'Siting context'].map(h => <th key={h} className="px-3 py-3 font-medium">{h}</th>)}</tr></thead><tbody>{segments.map((s, i) => <tr key={i} className="border-b border-line/70"><td className="px-3 py-3">{s.start}–{s.end} km</td><td className="px-3 py-3">{s.end - s.start} km</td><td className="px-3 py-3">{s.nearest} km away</td><td className={`px-3 py-3 font-medium ${s.covered ? 'text-brand' : 'text-red-300'}`}>{s.covered ? 'Covered' : 'Uncovered'}</td><td className="px-3 py-3">{s.covered ? 'Monitor utilisation' : 'Install DC fast charger'}</td><td className="px-3 py-3 text-soft">{['Fuel station', 'Rest area', 'Toll plaza', 'Major junction'][i % 4]}</td></tr>)}</tbody></table></div></section> }
function Comparison() { const rows = [['Lucknow', '34,280', '186', '343', '157', '617', '31%', '81', 'Critical'], ['Kanpur Nagar', '29,840', '144', '299', '155', '536', '29%', '79', 'Critical'], ['NH-27 Corridor', '—', '14', '7', '0', '0', '43%', '74', 'High']]; return <div className="mt-5 overflow-x-auto"><table className="w-full min-w-[820px] text-left text-xs"><thead className="border-b border-line font-mono text-[10px] uppercase text-soft"><tr>{['Geography', 'EV population', 'Existing', 'Required today', 'Additional today', 'Forecast add.', 'Coverage', 'Gap', 'Priority'].map(h => <th key={h} className="px-3 py-3">{h}</th>)}</tr></thead><tbody>{rows.map(r => <tr key={r[0]} className="border-b border-line/70"><td className="px-3 py-3 font-semibold">{r[0]}</td>{r.slice(1).map((v, i) => <td key={i} className={`px-3 py-3 ${i === 7 ? 'text-red-300' : ''}`}>{v}</td>)}</tr>)}</tbody></table></div> }
