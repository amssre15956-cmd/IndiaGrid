import { useState } from 'react'
import type { Scenario } from './Methodology'
import { Card, Slider, fmt, priorityOf, useInView, useTween, Glyph } from './meth-ui'

const BLUE = '#4d8dff'
const VIOLET = '#9b8cff'
const GREEN = '#35f5a1'

/* ───────────────────────── C. gap score ───────────────────────── */

const TERMS = [
  { name: 'EVs per charger', term: 'N(EVsPerCharger)', tip: 'More EVs per public charging point increases pressure.', icon: 'bolt' },
  { name: 'Coverage deficit', term: '(1 − CoverageScore)', tip: 'Shortfall against the selected planning target.', icon: 'target' },
  { name: 'Demand context', term: 'N(DemandContext)', tip: 'Population, urbanization, commercial activity, logistics, and tourism.', icon: 'globe' },
  { name: 'Corridor deficit', term: 'N(CorridorDeficit)', tip: 'Lack of chargers along national and state highways.', icon: 'road' },
]
const BAND_ARCS = [
  { l: 'Low', a: 0, len: 35, c: '#3ddc97' },
  { l: 'Medium', a: 35, len: 20, c: '#f5d04a' },
  { l: 'High', a: 55, len: 20, c: '#ff9a3c' },
  { l: 'Critical', a: 75, len: 25, c: '#ff5d73' },
]

function Gauge3D({ score, seen }: { score: number; seen: boolean }) {
  const g = useTween({ v: seen ? score : 0 }, 0.07)
  const pr = priorityOf(g.v)
  const R = 82
  const ang = ((Math.min(g.v, 100) / 100) * 360 - 90) * (Math.PI / 180)
  const kx = 100 + R * Math.cos(ang), ky = 100 + R * Math.sin(ang)
  return (
    <div className="mr-g3" role="img" aria-label={`Gap Score ${score.toFixed(2)} out of 100, priority ${priorityOf(score).label}`}>
      <div className="mr-g3-plate">
        <span className="mr-g3-base" style={{ boxShadow: `0 0 0 3px #0b1630, 0 30px 70px -10px ${pr.color}` }} />
        <svg viewBox="-8 -8 216 216" className="mr-g3-svg">
          <defs>
            <filter id="g3-glow" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="3.5" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
          </defs>
          <g transform="rotate(-90 100 100)">
            {BAND_ARCS.map((b) => (
              <circle key={b.l} cx="100" cy="100" r="97" pathLength="100" fill="none" stroke={b.c} strokeWidth="5" strokeDasharray={`${b.len - 0.6} ${100 - b.len + 0.6}`} strokeDashoffset={-b.a} opacity={pr.label === b.l ? 1 : 0.38} style={{ transition: 'opacity .3s' }} />
            ))}
            <circle cx="100" cy="100" r={R} pathLength="100" fill="none" stroke="rgba(120,160,255,.14)" strokeWidth="17" />
            <circle cx="100" cy="100" r={R} pathLength="100" fill="none" stroke={pr.color} strokeWidth="17" strokeLinecap="round" strokeDasharray={`${Math.min(g.v, 100)} 200`} filter="url(#g3-glow)" />
            <circle cx="100" cy="100" r="66" fill="none" stroke="rgba(120,160,255,.25)" strokeWidth="1" strokeDasharray="1.2 2.8" pathLength="100" />
          </g>
          <circle cx={kx} cy={ky} r="10" fill="#fff" filter="url(#g3-glow)" />
          <circle cx={kx} cy={ky} r="4.5" fill={pr.color} />
        </svg>
        <div className="mr-g3-core">
          <span className="mr-g3-num">{g.v.toFixed(2)}</span>
          <span className="mr-g3-of">/ 100</span>
          <span className="mr-g3-pr" style={{ borderColor: pr.color, color: pr.color }}>{pr.label} priority</span>
        </div>
      </div>
    </div>
  )
}

export function GapExplainer({ sc }: { sc: Scenario }) {
  const { s, set, w, setW, wsum, perCharger, required, coverage, parts, score } = sc
  const [hot, setHot] = useState<number | null>(null)
  const [ref, seen] = useInView<HTMLDivElement>(0.2)
  const pr = priorityOf(score)
  const modified = JSON.stringify([s.evs, s.pts, s.target, s.demand, s.corr]) !== JSON.stringify([40000, 300, 100, 0.7, 0.4])

  const bind = (i: number | null) => ({ onMouseEnter: () => setHot(i), onMouseLeave: () => setHot(null), onFocus: () => setHot(i), onBlur: () => setHot(null) })

  return (
    <>
      <div ref={ref} className="mr-panel mr-gap">
        <div className="mr-motes" aria-hidden="true">{Array.from({ length: 14 }, (_, i) => <i key={i} style={{ left: `${(i * 43) % 100}%`, top: `${(i * 59) % 100}%`, animationDelay: `${-i * 0.8}s` }} />)}</div>
        <header className="mr-panel-head">
          <div>
            <p className="mono-label" style={{ color: GREEN }}>The analytical heart of the platform</p>
            <h3>Gap Score explainer</h3>
          </div>
          <span className="mr-live"><i />Live · recalculates with every input</span>
        </header>

        <div className="mr-formula" role="group" aria-label="Gap Score formula">
          <span className="mr-f-lhs">GapScore</span><span className="mr-f-op">=</span><span className="mr-f-op">100 ×</span><span className="mr-f-br">[</span>
          {parts.map((p, i) => (
            <span key={p.k} className="mr-f-wrap">
              {i > 0 && <span className="mr-f-op">+</span>}
              <button className={`mr-f-term ${hot === i ? 'on' : ''} ${hot !== null && hot !== i ? 'dim' : ''}`} style={{ ['--k' as string]: p.color }} {...bind(i)} aria-describedby={`gap-tip-${i}`}>
                <b>{p.weight.toFixed(2)}</b>·{TERMS[i].term}
              </button>
            </span>
          ))}
          <span className="mr-f-br">]</span>
        </div>
        <p className="mr-note" style={{ marginTop: 10 }}>N(·) is min-max normalisation across districts, so every term is a 0–1 value. Weights are shown as fractions of 1.</p>

        <div className="mr-gap-main">
          <div className="mr-gauge-col">
            <Gauge3D score={score} seen={seen} />
            <div className="mr-comp" role="img" aria-label="Score composition">
              <div className="mr-comp-bar">
                {parts.map((p, i) => <span key={p.k} className={hot === i ? 'on' : ''} style={{ width: seen ? `${p.pts}%` : 0, background: p.color, transitionDelay: `${i * 0.12}s` }} />)}
                {[35, 55, 75].map((t) => <i key={t} style={{ left: `${t}%` }} />)}
              </div>
              <div className="mr-comp-scale"><span>0</span><span>35</span><span>55</span><span>75</span><span>100</span></div>
            </div>
          </div>

          <ul className="mr-bars" aria-label="Weighted contributions">
            {parts.map((p, i) => (
              <li key={p.k} tabIndex={0} className={`${hot === i ? 'on' : ''} ${hot !== null && hot !== i ? 'dim' : ''}`} style={{ ['--k' as string]: p.color }} {...bind(i)} aria-describedby={`gap-tip-${i}`}>
                <div className="mr-bar-top">
                  <span className="mr-bar-name"><i><Glyph n={TERMS[i].icon} size={14} /></i>{p.k}</span>
                  <span className="mr-wt">{Math.round(p.weight * 100)}%</span>
                </div>
                <div className="mr-bar-track"><span style={{ width: seen ? `${p.v * 100}%` : 0, transitionDelay: `${i * 0.12}s` }} /></div>
                <dl className="mr-bar-math">
                  <div><dt>Weight</dt><dd>{p.weight.toFixed(2)}</dd></div>
                  <div><dt>Normalized</dt><dd>{p.v.toFixed(2)}</dd></div>
                  <div><dt>Contribution</dt><dd><b>{p.pts.toFixed(2)}</b> pts</dd></div>
                </dl>
                <span id={`gap-tip-${i}`} role="tooltip" className="mr-tip bar">{TERMS[i].tip}</span>
              </li>
            ))}
            <li className="mr-sum"><span>Σ contributions</span><b>{score.toFixed(2)}</b><span>/ 100 · {pr.label}</span></li>
          </ul>
        </div>
      </div>

      <div className="mr-two">
        <Card className="mr-card-dark">
          <div className="mr-card-head">
            <h3 className="font-display text-base font-semibold">District example · Lucknow{modified && <span className="mr-modified"> (modified)</span>}</h3>
            {modified && <button className="mr-mini-btn" onClick={sc.reset}>Reset</button>}
          </div>
          <dl className="mr-dl">
            {[
              ['District', 'Lucknow'],
              ['EVs', fmt(s.evs)],
              ['Existing public charging points', fmt(s.pts)],
              ['Target', `${s.target} EVs per charger`],
              ['EVs per charger', fmt(perCharger, 1)],
              ['Required chargers', fmt(required)],
              ['Coverage score', `${Math.round(coverage * 100)}%`],
              ['Demand context', s.demand.toFixed(2)],
              ['Corridor deficit', s.corr.toFixed(2)],
              ['Final Gap Score', score.toFixed(2)],
              ['Priority', pr.label],
            ].map(([k, v], i) => (
              <div key={k} className={i >= 9 ? 'final' : ''} style={i === 10 ? { ['--k' as string]: pr.color } : undefined}><dt>{k}</dt><dd>{v}</dd></div>
            ))}
          </dl>
          <p className="mr-note font-mono">100 × [{parts.map((p) => `${p.weight.toFixed(2)}×${p.v.toFixed(2)}`).join(' + ')}] = <b className="text-ink">{score.toFixed(2)}</b></p>
        </Card>

        <Card className="mr-card-dark" title="Priority bands">
          <div className="mr-bandbar" role="img" aria-label="Priority bands from low to critical">
            <span style={{ left: `${Math.min(score, 100)}%` }} />
          </div>
          <ul className="mr-bands">
            {[...BAND_ARCS].reverse().map((b) => {
              const rng = b.l === 'Low' ? '0–34' : b.l === 'Medium' ? '35–54' : b.l === 'High' ? '55–74' : '75–100'
              return (
                <li key={b.l} className={pr.label === b.l ? 'on' : ''} style={{ ['--k' as string]: b.c }}>
                  <i /><span><b>{b.l}</b><small>{{ Low: 'Maintain coverage and reassess after EV growth.', Medium: 'Monitor and plan medium-term expansion.', High: 'Include in the near-term expansion plan.', Critical: 'Immediate expansion and a detailed location study.' }[b.l]}</small></span><code>{rng}</code>
                </li>
              )
            })}
          </ul>
        </Card>
      </div>

      <div className="mr-two">
        <Card title="Scenario inputs">
          <div className="space-y-5">
            <Slider label="Registered EVs" value={s.evs} min={1000} max={500000} step={1000} onChange={set('evs')} />
            <Slider label="Existing public chargers" value={s.pts} min={10} max={3000} step={5} onChange={set('pts')} />
            <Slider label="Target EVs per charger" value={s.target} min={25} max={250} step={5} onChange={set('target')} hint="Default 100." />
            <Slider label="Demand context (normalised)" value={s.demand} min={0} max={1} step={0.05} onChange={set('demand')} />
            <Slider label="Corridor deficit (normalised)" value={s.corr} min={0} max={1} step={0.05} onChange={set('corr')} />
            <Slider label="Max EVs per charger across districts" value={s.ceil} min={50} max={400} step={0.1} onChange={set('ceil')} hint="Normalisation ceiling. 166.67 reproduces N = 0.80." />
          </div>
        </Card>
        <Card title="Component weights (configurable)">
          <div className="space-y-5">
            <Slider label="EVs per charger" value={w.e} min={0} max={100} unit="%" onChange={(v) => setW({ ...w, e: v })} />
            <Slider label="Coverage deficit" value={w.c} min={0} max={100} unit="%" onChange={(v) => setW({ ...w, c: v })} />
            <Slider label="Demand context" value={w.d} min={0} max={100} unit="%" onChange={(v) => setW({ ...w, d: v })} />
            <Slider label="Corridor deficit" value={w.r} min={0} max={100} unit="%" onChange={(v) => setW({ ...w, r: v })} />
          </div>
          <p className={`mt-4 text-xs ${wsum === 100 ? 'text-soft' : 'text-[#ffb454]'}`} role="status">Weights sum to {wsum}%{wsum !== 100 && ', rescaled to 100% for the calculation.'}</p>
          <button onClick={sc.reset} className="btn-ghost mt-4 rounded-xl px-4 py-2 text-sm">Reset to Lucknow example</button>
        </Card>
      </div>
    </>
  )
}

/* ───────────────────────── D. forecasting ───────────────────────── */

const SCENARIOS = [
  { k: 'Conservative', v: 150, d: 'Fewer chargers needed per EV' },
  { k: 'Base case', v: 100, d: 'Default planning target' },
  { k: 'Aggressive', v: 70, d: 'More chargers per EV' },
]
const compact = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(n >= 100000 ? 0 : 1)}k` : `${Math.round(n)}`)

export function ForecastLab({ sc }: { sc: Scenario }) {
  const { s, set } = sc
  const [ref, seen] = useInView<HTMLDivElement>(0.15)
  const t = useTween({ g: s.growth, y: s.years, tg: s.target, evs: s.evs, pts: s.pts }, 0.14)
  const [hotYear, setHotYear] = useState<number | null>(null)

  const W = 660, H = 320, pl = 62, pr = 62, pt = 26, pb = 40
  const ev = (x: number) => t.evs * Math.pow(1 + t.g / 100, x)
  const req = (x: number) => ev(x) / t.tg
  const evMax = ev(t.y) * 1.25
  const chMax = Math.max(req(t.y), t.pts) * 1.14
  const X = (x: number) => pl + (x / t.y) * (W - pl - pr)
  const YE = (v: number) => H - pb - (v / evMax) * (H - pt - pb)
  const YC = (v: number) => H - pb - (v / chMax) * (H - pt - pb)
  const N = 56
  const xs = Array.from({ length: N + 1 }, (_, i) => (i / N) * t.y)
  const evPath = xs.map((x, i) => `${i ? 'L' : 'M'}${X(x).toFixed(1)},${YE(ev(x)).toFixed(1)}`).join(' ')
  const reqPath = xs.map((x, i) => `${i ? 'L' : 'M'}${X(x).toFixed(1)},${YC(req(x)).toFixed(1)}`).join(' ')
  const reqArea = `${reqPath} L${X(t.y)},${H - pb} L${X(0)},${H - pb} Z`

  const fe = ev(t.y)
  const requiredN = Math.ceil(fe / t.tg)
  const extra = Math.max(0, requiredN - Math.round(t.pts))
  const cov = Math.min(1, t.pts / Math.max(1, fe / t.tg))
  const covColor = cov >= 0.9 ? GREEN : cov >= 0.6 ? '#f5d04a' : cov >= 0.4 ? '#ff9a3c' : '#ff5d73'
  const years = Array.from({ length: s.years + 1 }, (_, n) => n)
  const exact = {
    fe: s.evs * Math.pow(1 + s.growth / 100, s.years),
  }
  const reqExact = Math.ceil(exact.fe / s.target)

  return (
    <div ref={ref}>
      <div className="mr-formulas">
        {[
          { k: 'Forecast EVs', f: ['ForecastEVs', ' = ', 'CurrentEVs', ' × ', '(1 + g)', '^n'], live: `${fmt(s.evs)} × (1 + ${(s.growth / 100).toFixed(2)})^${s.years} = ${fmt(exact.fe)}`, c: BLUE },
          { k: 'Required chargers', f: ['RequiredChargers', ' = ', 'ceil(', 'ForecastEVs', ' / ', 'TargetEVsPerCharger', ')'], live: `ceil(${fmt(exact.fe)} / ${s.target}) = ${fmt(reqExact)}`, c: VIOLET },
          { k: 'Additional chargers', f: ['AdditionalChargers', ' = ', 'max(0, ', 'RequiredChargers', ' − ', 'ExistingChargers', ')'], live: `max(0, ${fmt(reqExact)} − ${fmt(s.pts)}) = ${fmt(Math.max(0, reqExact - s.pts))}`, c: GREEN },
        ].map((x, i) => (
          <figure key={x.k} className="mr-fcard" style={{ ['--k' as string]: x.c }}>
            <figcaption className="mono-label">{String.fromCharCode(49 + i)} · {x.k}</figcaption>
            <div className="mr-fcode">{x.f.map((p, j) => <span key={j} className={j % 2 === 0 && j > 0 && p.length > 3 ? 'var' : ''}>{p}</span>)}</div>
            <code className="mr-flive">{x.live}</code>
          </figure>
        ))}
      </div>

      <div className="mr-panel mr-fc">
        <div className="mr-motes" aria-hidden="true">{Array.from({ length: 10 }, (_, i) => <i key={i} style={{ left: `${(i * 47) % 100}%`, top: `${(i * 67) % 100}%`, animationDelay: `${-i}s` }} />)}</div>
        <header className="mr-panel-head">
          <div>
            <p className="mono-label" style={{ color: VIOLET }}>Scenario forecasting · policy-ready</p>
            <h3>How charger requirements evolve</h3>
          </div>
          <div className="mr-chips" role="group" aria-label="Planning scenarios">
            {SCENARIOS.map((c) => (
              <button key={c.k} className={s.target === c.v ? 'on' : ''} onClick={() => set('target')(c.v)} aria-pressed={s.target === c.v} title={c.d}>
                <b>{c.k}</b><small>{c.v} EVs / charger</small>
              </button>
            ))}
          </div>
        </header>

        <div className="mr-fc-grid">
          <div className="mr-chart-wrap">
            <svg viewBox={`0 0 ${W} ${H}`} className="mr-chart" role="img" aria-label={`Dual-line chart: EV population grows from ${fmt(s.evs)} to ${fmt(exact.fe)}, required chargers grow to ${fmt(reqExact)}, against ${fmt(s.pts)} existing.`}>
              <defs>
                <linearGradient id="fc-area" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={VIOLET} stopOpacity=".38" /><stop offset="1" stopColor={VIOLET} stopOpacity="0" /></linearGradient>
                <clipPath id="fc-above"><rect x="0" y="0" width={W} height={Math.max(0, YC(t.pts))} /></clipPath>
                <filter id="fc-glow" x="-10%" y="-20%" width="120%" height="140%"><feGaussianBlur stdDeviation="3" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
              </defs>
              {[0, 0.25, 0.5, 0.75, 1].map((f) => (
                <g key={f}>
                  <line x1={pl} x2={W - pr} y1={H - pb - f * (H - pt - pb)} y2={H - pb - f * (H - pt - pb)} stroke="var(--line)" strokeDasharray={f ? '3 6' : undefined} />
                  <text x={pl - 8} y={H - pb - f * (H - pt - pb) + 4} textAnchor="end" className="mr-ax" fill={BLUE}>{compact(f * evMax)}</text>
                  <text x={W - pr + 8} y={H - pb - f * (H - pt - pb) + 4} className="mr-ax" fill={VIOLET}>{compact(f * chMax)}</text>
                </g>
              ))}
              <text x={pl - 8} y={14} textAnchor="end" className="mr-ax-t" fill={BLUE}>EVs</text>
              <text x={W - pr + 8} y={14} className="mr-ax-t" fill={VIOLET}>Chargers</text>
              <path d={reqArea} fill="url(#fc-area)" clipPath="url(#fc-above)" />
              <line x1={pl} x2={W - pr} y1={YC(t.pts)} y2={YC(t.pts)} stroke={GREEN} strokeWidth="2" strokeDasharray="7 5" className="mr-ref" />
              <text x={pl + 8} y={YC(t.pts) - 8} className="mr-ax" fill={GREEN}>Existing {fmt(Math.round(t.pts))}</text>
              <path d={evPath} fill="none" stroke={BLUE} strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" filter="url(#fc-glow)" className={seen ? 'mr-draw' : ''} />
              <path d={reqPath} fill="none" stroke={VIOLET} strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" filter="url(#fc-glow)" className={seen ? 'mr-draw' : ''} style={{ animationDelay: '.25s' }} />
              {years.map((n) => {
                const x = (n / s.years) * t.y
                const on = hotYear === n
                return (
                  <g key={n} onMouseEnter={() => setHotYear(n)} onMouseLeave={() => setHotYear(null)} tabIndex={0} onFocus={() => setHotYear(n)} onBlur={() => setHotYear(null)} style={{ outline: 'none' }}>
                    <rect x={X(x) - 18} y={pt} width="36" height={H - pt - pb} fill="transparent" />
                    {on && <line x1={X(x)} x2={X(x)} y1={pt} y2={H - pb} stroke="var(--line)" />}
                    <circle cx={X(x)} cy={YE(ev(x))} r={on ? 6 : 3.5} fill={BLUE} />
                    <circle cx={X(x)} cy={YC(req(x))} r={on ? 6 : 3.5} fill={VIOLET} />
                    <text x={X(x)} y={H - 14} textAnchor="middle" className="mr-ax" fill="var(--text-soft)">{n === 0 ? 'Now' : `+${n}y`}</text>
                  </g>
                )
              })}
              {hotYear !== null && (() => {
                const x = (hotYear / s.years) * t.y
                const tx = Math.min(Math.max(X(x) - 78, pl), W - pr - 156)
                return (
                  <g pointerEvents="none">
                    <rect x={tx} y={pt + 4} width="156" height="58" rx="10" fill="var(--surface-strong)" stroke="var(--line)" />
                    <text x={tx + 10} y={pt + 22} className="mr-ax" fill={BLUE}>EVs {fmt(Math.round(ev(x)))}</text>
                    <text x={tx + 10} y={pt + 38} className="mr-ax" fill={VIOLET}>Required {fmt(Math.ceil(ev(x) / t.tg))}</text>
                    <text x={tx + 10} y={pt + 54} className="mr-ax" fill={GREEN}>Additional {fmt(Math.max(0, Math.ceil(ev(x) / t.tg) - Math.round(t.pts)))}</text>
                  </g>
                )
              })()}
            </svg>
            <p className="mr-legend">
              <span><i style={{ background: BLUE }} />EV population (left axis)</span>
              <span><i style={{ background: VIOLET }} />Required public charging points (right axis)</span>
              <span><i style={{ background: GREEN }} />Existing charging points</span>
            </p>
          </div>

          <div className="mr-fc-side">
            <div className="mr-extra" style={{ ['--k' as string]: covColor }}>
              <p className="mono-label">Additional chargers required</p>
              <strong aria-live="polite">{fmt(extra)}</strong>
              <small>{fmt(requiredN)} required − {fmt(Math.round(t.pts))} existing</small>
            </div>
            <div className="mr-cov" role="img" aria-label={`Coverage at horizon ${Math.round(cov * 100)}%`}>
              <svg viewBox="0 0 120 70">
                <path d="M10 62 A50 50 0 0 1 110 62" pathLength="100" fill="none" stroke="var(--line)" strokeWidth="10" strokeLinecap="round" />
                <path d="M10 62 A50 50 0 0 1 110 62" pathLength="100" fill="none" stroke={covColor} strokeWidth="10" strokeLinecap="round" strokeDasharray={`${cov * 100} 100`} style={{ filter: `drop-shadow(0 0 5px ${covColor})` }} />
              </svg>
              <div><b>{Math.round(cov * 100)}%</b><small>coverage at +{s.years}y</small></div>
            </div>
            <div className="mr-controls">
              <Slider label="Annual EV growth rate" value={s.growth} min={0} max={50} unit="%" onChange={set('growth')} />
              <Slider label="Forecast horizon" value={s.years} min={1} max={10} unit=" yrs" onChange={set('years')} />
              <Slider label="Target EVs per charger" value={s.target} min={25} max={250} step={5} onChange={set('target')} />
            </div>
          </div>
        </div>
      </div>

      <div className="mr-worked">
        <p className="mono-label">Worked example · live</p>
        <dl>
          {[
            ['Current EVs', fmt(s.evs)],
            ['Annual EV growth', `${s.growth}%`],
            ['Forecast horizon', `${s.years} years`],
            ['Forecast EVs', fmt(exact.fe)],
            ['Target', `${s.target} EVs per charger`],
            ['Required chargers', fmt(reqExact)],
            ['Existing chargers', fmt(s.pts)],
            ['Additional chargers required', fmt(Math.max(0, reqExact - s.pts))],
          ].map(([k, v], i) => <div key={k} className={i === 7 ? 'final' : ''}><dt>{k}</dt><dd>{v}</dd></div>)}
        </dl>
        <p className="mr-note">At the defaults, 40,000 × 1.18³ = 65,721 forecast EVs. At 100 EVs per charger that needs 658 chargers, so 358 are additional to the 300 that exist.</p>
      </div>
    </div>
  )
}
