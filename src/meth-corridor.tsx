import { useState } from 'react'
import type { Scenario } from './Methodology'
import { Glyph, priorityOf, useInView } from './meth-ui'

const BLUE = '#4d8dff'
const VIOLET = '#9b8cff'
const GREEN = '#35f5a1'
const RED = '#ff5d73'
const YELLOW = '#f5d04a'

/* ───────────── corridor geometry (illustrative NH-44 sample section) ───────────── */

const W = 720, H = 300
const START = 7, SEG = 25, COUNT = 12, LEN = SEG * COUNT
const CHARGERS_KM = [11, 71, 86, 110, 203, 218, 302]
const CONTEXT = ['Toll plaza', 'Fuel station', 'Rest area', 'Major junction', 'Industrial cluster', 'Fuel station', 'Toll plaza', 'Rest area', 'Industrial cluster', 'Major junction', 'Fuel station', 'Toll plaza']

const pt = (km: number): [number, number] => {
  const u = (km - START) / LEN
  return [36 + u * (W - 72), 150 + 54 * Math.sin(u * Math.PI * 2.4 + 0.4) + 10 * Math.sin(u * 17)]
}
const line = (a: number, b: number) => {
  const out: string[] = []
  for (let k = a; k <= b + 0.01; k += 2.5) out.push(pt(k).map((n) => n.toFixed(1)).join(','))
  return out.join(' ')
}

const SEGMENTS = Array.from({ length: COUNT }, (_, i) => {
  const a = START + i * SEG, b = a + SEG, mid = (a + b) / 2
  const nearest = Math.min(...CHARGERS_KM.map((c) => Math.abs(c - mid)))
  const covered = nearest <= SEG
  const [x, y] = pt(mid)
  return { i, a, b, mid, nearest, covered, ctx: CONTEXT[i], pts: line(a, b), x, y }
})
const COVERED = SEGMENTS.filter((s) => s.covered).length
const COVERAGE = (COVERED / COUNT) * 100
const EXISTING_N = CHARGERS_KM.length
const RECOMMENDED = Math.max(0, Math.ceil(LEN / SEG) - EXISTING_N)

function Corridor() {
  const [hov, setHov] = useState<number | null>(null)
  const seg = hov !== null ? SEGMENTS[hov] : null
  return (
    <div className="mr-corr">
      <div className="mr-corr-stage">
        <svg viewBox={`0 0 ${W} ${H}`} className="mr-corr-svg" role="img" aria-label={`NH-44 sample section, ${LEN} km split into ${COUNT} segments of 25 km. ${COVERED} covered, ${COUNT - COVERED} uncovered.`}>
          <defs>
            <filter id="cr-glow" x="-10%" y="-30%" width="120%" height="160%"><feGaussianBlur stdDeviation="3" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
          </defs>
          <g opacity=".5">{Array.from({ length: 10 }, (_, k) => <line key={k} x1={0} x2={W} y1={k * 33} y2={k * 33} stroke="var(--line)" strokeDasharray="2 8" />)}</g>
          <polyline points={line(START, START + LEN)} className="mr-buf" />
          <text x={W - 14} y="30" textAnchor="end" className="mr-ax" fill={BLUE}>5 km buffer each side</text>
          {SEGMENTS.map((s) => {
            const col = s.covered ? GREEN : RED
            return (
              <g key={s.i} tabIndex={0} role="button" aria-label={`Segment ${s.a}–${s.b} km, ${s.covered ? 'covered' : 'uncovered'}`} className={`mr-seg ${hov === s.i ? 'on' : ''}`} onMouseEnter={() => setHov(s.i)} onMouseLeave={() => setHov(null)} onFocus={() => setHov(s.i)} onBlur={() => setHov(null)}>
                <polyline points={s.pts} className="mr-seg-hit" />
                <polyline points={s.pts} className="mr-seg-line" stroke={col} filter={hov === s.i ? 'url(#cr-glow)' : undefined} />
              </g>
            )
          })}
          {SEGMENTS.map((s) => { const [x, y] = pt(s.a); return <g key={`t${s.i}`}><circle cx={x} cy={y} r="2.6" fill="var(--bg, #07101f)" stroke="var(--text-soft)" />{s.i % 3 === 0 && <text x={x} y={y + 24} textAnchor="middle" className="mr-ax" fill="var(--text-soft)">{s.a} km</text>}</g> })}
          {CHARGERS_KM.map((c) => { const [x, y] = pt(c); return <g key={c} className="mr-cpin" transform={`translate(${x} ${y - 16})`}><path d="M0 14 C-8 4 -8 -8 0 -8 8 -8 8 4 0 14Z" fill={BLUE} stroke="#fff" strokeWidth="1.2" /><circle cy="-1" r="2.6" fill="#fff" /></g> })}
          {SEGMENTS.filter((s) => !s.covered).map((s) => (
            <g key={`r${s.i}`} transform={`translate(${s.x} ${s.y + 14})`}>
              <circle r="7" className="mr-rec-ring" />
              <circle r="7" className="mr-rec-ring d2" />
              <path d="M0 -3 C-7 -13 -7 -25 0 -25 7 -25 7 -13 0 -3Z" fill={VIOLET} stroke="#fff" strokeWidth="1.2" transform="translate(0 6)" />
              <circle cy="-12" r="2.6" fill="#fff" />
            </g>
          ))}
          <text x="36" y="22" className="mr-ax-t" fill="var(--text)">NH-44 · sample section km {START}–{START + LEN}</text>
        </svg>

        {seg && (
          <div className="mr-seg-tip" role="status" style={{ left: `${(seg.x / W) * 100}%`, top: `${(seg.y / H) * 100}%`, ['--k' as string]: seg.covered ? GREEN : RED }}>
            <b>{seg.a}–{seg.b} km</b>
            <dl>
              <div><dt>Nearest charger</dt><dd>{Math.round(seg.nearest)} km</dd></div>
              <div><dt>Coverage</dt><dd className="st">{seg.covered ? 'Covered' : 'Uncovered'}</dd></div>
              <div><dt>Action</dt><dd>{seg.covered ? 'Maintain; monitor utilisation.' : 'Add a 60 kW+ DC fast charger.'}</dd></div>
              <div><dt>Siting context</dt><dd>{seg.ctx}</dd></div>
            </dl>
          </div>
        )}
      </div>
      <p className="mr-legend">
        <span><i style={{ background: GREEN }} />Covered</span><span><i style={{ background: RED }} />Uncovered</span>
        <span><i className="round" style={{ background: BLUE }} />Existing charger</span><span><i className="round" style={{ background: VIOLET }} />Recommended</span>
        <span><i style={{ background: BLUE, opacity: 0.3, height: 8 }} />5 km buffer</span>
      </p>

      <div className="mr-cformulas">
        <figure style={{ ['--k' as string]: GREEN }}>
          <figcaption className="mono-label">Corridor coverage</figcaption>
          <div className="mr-fcode">
            <span>CorridorCoverage</span> = <span className="frac"><em>CoveredSamplePoints</em><em>TotalSamplePoints</em></span> × 100
          </div>
          <code className="mr-flive">{COVERED} / {COUNT} × 100 = <b>{COVERAGE.toFixed(1)}%</b></code>
        </figure>
        <figure style={{ ['--k' as string]: VIOLET }}>
          <figcaption className="mono-label">Recommended additional chargers</figcaption>
          <div className="mr-fcode">
            <span>RecommendedAdditionalChargers</span> = max(0, ceil(<span className="frac"><em>HighwayLength</em><em>25</em></span>) − <span>ExistingCorridorChargers</span>)
          </div>
          <code className="mr-flive">max(0, ceil({LEN} / 25) − {EXISTING_N}) = <b>{RECOMMENDED}</b></code>
        </figure>
      </div>
      <p className="mr-note">A segment is covered when a charger lies within 25 km of its midpoint sample point. Geometry and charger positions are illustrative.</p>
    </div>
  )
}

/* ───────────── validation + sensitivity ───────────── */

type St = 'pass' | 'warn' | 'fail'
const CHECKS: { k: string; st: St; metric: string; detail: string }[] = [
  { k: 'Schema validation', st: 'pass', metric: '18,450 / 18,450', detail: 'All records carry required fields with the expected types.' },
  { k: 'Coordinate validation', st: 'warn', metric: '218 flagged', detail: '1.2% of records fall outside the India bounding box or lack coordinates. Flagged and retained.' },
  { k: 'Duplicate detection', st: 'pass', metric: '312 resolved', detail: 'Cross-feed duplicates merged within 75–150 m. No unresolved suspects above threshold.' },
  { k: 'District spatial-match validation', st: 'warn', metric: '41 unmatched', detail: 'Points on district edges found no containing polygon and are tagged UNMATCHED_DISTRICT.' },
  { k: 'Cross-source charger comparison', st: 'fail', metric: '2 districts > 5%', detail: 'BEE and Open Charge Map counts differ by more than the 5% tolerance in two districts. Needs review.' },
  { k: 'Sensitivity analysis', st: 'pass', metric: 'Band stable', detail: 'Priority band holds across the tested parameter ranges below.' },
]
const ST = { pass: { c: GREEN, l: 'Passed', i: 'check' }, warn: { c: YELLOW, l: 'Warning', i: 'warn' }, fail: { c: RED, l: 'Failed', i: 'x' } }

function gapAt(sc: Scenario, o: { target?: number; growth?: number; corrW?: number }) {
  const { s, w } = sc
  const g = o.growth ?? s.growth
  const target = o.target ?? s.target
  const evsF = s.evs * Math.pow(1 + g / 100, s.years)
  const n = Math.min(1, evsF / s.pts / s.ceil)
  const cov = Math.min(1, s.pts / (evsF / target))
  const sum = w.e + w.c + w.d + w.r || 1
  let [we, wc, wd, wr] = [w.e / sum, w.c / sum, w.d / sum, w.r / sum]
  if (o.corrW !== undefined) {
    const r = o.corrW / 100
    const rest = we + wc + wd || 1
    we = (we / rest) * (1 - r); wc = (wc / rest) * (1 - r); wd = (wd / rest) * (1 - r); wr = r
  }
  return 100 * (we * n + wc * (1 - cov) + wd * s.demand + wr * s.corr)
}

function Sensitivity({ sc }: { sc: Scenario }) {
  const [ref, seen] = useInView<HTMLDivElement>(0.3)
  const base = gapAt(sc, {})
  const rows = [
    { k: 'Target EVs per charger', a: ['70', gapAt(sc, { target: 70 })], b: ['150', gapAt(sc, { target: 150 })] },
    { k: 'EV growth rate', a: ['10%', gapAt(sc, { growth: 10 })], b: ['25%', gapAt(sc, { growth: 25 })] },
    { k: 'Corridor-deficit weight', a: ['5%', gapAt(sc, { corrW: 5 })], b: ['15%', gapAt(sc, { corrW: 15 })] },
  ] as { k: string; a: [string, number]; b: [string, number] }[]
  const all = rows.flatMap((r) => [r.a[1], r.b[1]])
  const bands = new Set(all.concat(base).map((v) => priorityOf(v).label))
  return (
    <div ref={ref} className="mr-sens">
      <div className="mr-sens-head"><p className="mono-label">Sensitivity · projected Gap Score at +{sc.s.years}y</p><span>Baseline <b>{base.toFixed(1)}</b> · {priorityOf(base).label}</span></div>
      <div className="mr-sens-plot">
        <div className="mr-sens-bands" aria-hidden="true"><i style={{ width: '35%', background: '#3ddc97' }} /><i style={{ width: '20%', background: '#f5d04a' }} /><i style={{ width: '20%', background: '#ff9a3c' }} /><i style={{ width: '25%', background: '#ff5d73' }} /></div>
        <span className="mr-sens-base" style={{ left: `${Math.min(base, 100)}%` }} aria-hidden="true" />
        {rows.map((r, i) => {
          const [lo, hi] = r.a[1] <= r.b[1] ? [r.a, r.b] : [r.b, r.a]
          return (
            <div key={r.k} className="mr-sens-row" title={`${r.k}: ${r.a[0]} → ${r.a[1].toFixed(1)}, ${r.b[0]} → ${r.b[1].toFixed(1)}`}>
              <span className="mr-sens-k">{r.k}<small>{r.a[0]} to {r.b[0]}</small></span>
              <div className="mr-sens-track">
                <span style={{ left: `${Math.min(lo[1], 100)}%`, width: seen ? `${Math.max(1.5, Math.min(hi[1], 100) - Math.min(lo[1], 100))}%` : 0, transitionDelay: `${i * 0.15}s` }} />
                <em style={{ left: `${Math.min(lo[1], 100)}%` }}>{lo[1].toFixed(1)} <small>@{lo[0]}</small></em>
                <em className="r" style={{ left: `${Math.min(hi[1], 100)}%` }}>{hi[1].toFixed(1)} <small>@{hi[0]}</small></em>
              </div>
            </div>
          )
        })}
      </div>
      <p className="mr-note">{bands.size === 1 ? `The priority band stays ${[...bands][0]} across every tested range.` : `The priority band shifts between ${[...bands].join(' and ')} across the tested ranges, so treat this district as sensitive to its assumptions.`}</p>
    </div>
  )
}

function Validation({ sc }: { sc: Scenario }) {
  const [open, setOpen] = useState<number | null>(null)
  const counts = { pass: 0, warn: 0, fail: 0 }
  CHECKS.forEach((c) => counts[c.st]++)
  return (
    <div className="mr-val">
      <div className="mr-val-head">
        <div><p className="mono-label" style={{ color: GREEN }}>Validation & quality assurance</p><h3>Six checks before any number is trusted</h3></div>
        <p className="mr-val-sum"><span style={{ color: GREEN }}>{counts.pass} passed</span><span style={{ color: YELLOW }}>{counts.warn} warnings</span><span style={{ color: RED }}>{counts.fail} failed</span></p>
      </div>
      <ul className="mr-checks">
        {CHECKS.map((c, i) => {
          const st = ST[c.st]
          return (
            <li key={c.k} className={open === i ? 'open' : ''} style={{ ['--k' as string]: st.c }}>
              <button onClick={() => setOpen(open === i ? null : i)} onMouseEnter={() => setOpen(i)} onMouseLeave={() => setOpen(null)} onFocus={() => setOpen(i)} onBlur={() => setOpen(null)} aria-expanded={open === i}>
                <span className="mr-ck-i"><Glyph n={st.i} size={16} /></span>
                <span className="mr-ck-t"><b>{c.k}</b><small>{c.metric}</small></span>
                <span className="mr-ck-s">{st.l}</span>
              </button>
              <p>{c.detail}</p>
            </li>
          )
        })}
      </ul>
      <Sensitivity sc={sc} />
      <p className="mr-note">Check results shown are illustrative prototype outputs. Warnings and failures never delete records; they route them to review.</p>
    </div>
  )
}

export function CorridorValidation({ sc }: { sc: Scenario }) {
  return (
    <div className="mr-split">
      <div className="mr-panel mr-corridor">
        <header className="mr-panel-head">
          <div>
            <p className="mono-label" style={{ color: BLUE }}>Highway corridor analysis</p>
            <h3>Where does the highway go dark?</h3>
          </div>
          <span className="mr-live"><i />{COVERAGE.toFixed(0)}% covered · {RECOMMENDED} new sites</span>
        </header>
        <Corridor />
      </div>
      <div className="mr-panel mr-validation">
        <Validation sc={sc} />
      </div>
    </div>
  )
}
