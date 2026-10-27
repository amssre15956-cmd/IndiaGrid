import { useEffect, useState } from 'react'
import { Glyph, Tile3D, fmt, reducedMotion } from './meth-ui'

const BLUE = '#4d8dff'
const CYAN = '#3fd8f5'
const VIOLET = '#9b8cff'
const GREEN = '#35f5a1'
const AMBER = '#ffb454'
const RED = '#ff5d73'

/* ───────────────────────── A. data cleaning ───────────────────────── */

const CLEAN = [
  { k: 'Raw Data', ico: 'db', line: 'Five source families land untouched.', rule: 'Records are stored exactly as received. source_system and ingested_at are attached before any transformation.', n: 18450, unit: 'records in' },
  { k: 'Schema Validation', ico: 'schema', line: 'Required columns and types are checked.', rule: 'Every record must carry the required fields with the expected data types. Failures go to a review table, never dropped.', n: 18450, unit: 'checked' },
  { k: 'Standardization', ico: 'std', line: 'Names and codes map to one vocabulary.', rule: 'State/UT, district, fuel type, vehicle category and connector names map to controlled values, e.g. “lucknow ,” becomes “Lucknow”.', n: 18450, unit: 'mapped' },
  { k: 'Coordinate Validation', ico: 'cross', line: 'Lat / lon tested against India bounds.', rule: 'Valid when 6.0 ≤ lat ≤ 37.5 and 68.0 ≤ lon ≤ 97.5. Otherwise INVALID_COORDINATE; empty values become MISSING_COORDINATE.', n: 18232, unit: 'valid · 218 flagged' },
  { k: 'Geocoding', ico: 'pin', line: 'Missing positions recovered from address.', rule: 'Records with an address or PIN code but no usable coordinate are geocoded. The approximate position keeps its original source reference.', n: 164, unit: 'recovered' },
  { k: 'Duplicate Detection', ico: 'dupe', line: 'Overlapping charger records merged.', rule: 'Match on station name, operator, PIN code, rounded coordinates and haversine distance of 75–150 m. Matches are tagged DUPLICATE_SUSPECT, then merged.', n: 312, unit: 'resolved' },
  { k: 'Quality Flagging', ico: 'flag', line: 'Every record gets a quality flag.', rule: 'One of OK, SAMPLE, MISSING_COORDINATE, INVALID_COORDINATE, DUPLICATE_SUSPECT, UNMATCHED_DISTRICT or STALE_RECORD is written to data_quality_flag.', n: 18450, unit: 'tagged' },
  { k: 'Analytical Dataset', ico: 'layers', line: 'One unified, provenance-tagged table.', rule: 'Only the unified table feeds the Gap Score. Flagged rows stay in the table with their flag so analysts can filter them, never silently deleted.', n: 18138, unit: 'unified' },
]

const QFLAGS: [string, string, string][] = [
  ['INVALID_COORDINATE', 'Coordinates fall outside the India bounding box, e.g. lat = 999.', RED],
  ['DUPLICATE_SUSPECT', 'Same station name, operator and location within 75–150 m of another record.', VIOLET],
  ['UNMATCHED_DISTRICT', 'The point-in-polygon spatial join found no containing district.', AMBER],
]

export function CleaningFlow() {
  const [lit, setLit] = useState(0)
  const [hov, setHov] = useState<number | null>(null)
  const [flagTip, setFlagTip] = useState(0)
  const [run, setRun] = useState(0)

  useEffect(() => {
    if (reducedMotion()) { setLit(8); return }
    const t = setInterval(() => setLit((l) => (l >= 9 ? 0 : l + 1)), 1100)
    return () => clearInterval(t)
  }, [])

  return (
    <div className="mr-panel mr-clean">
      <div className="mr-motes" aria-hidden="true">{Array.from({ length: 16 }, (_, i) => <i key={i} style={{ left: `${(i * 37) % 100}%`, top: `${(i * 53) % 100}%`, animationDelay: `${-i * 0.7}s`, animationDuration: `${7 + (i % 5)}s` }} />)}</div>
      <header className="mr-panel-head">
        <div>
          <p className="mono-label" style={{ color: CYAN }}>Cleaning flow · 8 stages</p>
          <h3>From raw feeds to an analytical dataset</h3>
        </div>
        <span className="mr-live"><i />Prototype counts are illustrative</span>
      </header>

      <ol className="mr-cl" aria-label="Data cleaning pipeline">
        {CLEAN.map((c, k) => {
          const state = k < lit ? 'done' : k === lit ? 'run' : 'wait'
          const seg = hov === k || hov === k + 1
          return (
            <li key={c.k} className={`${state} ${hov === k ? 'hover' : ''} ${seg ? 'seg-hot' : ''} ${k < lit ? 'seg-lit' : ''} ${k % 4 === 3 ? 'row-end' : ''}`}>
              <button
                onMouseEnter={() => setHov(k)} onMouseLeave={() => setHov(null)} onFocus={() => setHov(k)} onBlur={() => setHov(null)}
                aria-describedby={`cl-tip-${k}`}
              >
                <span className="mr-idx">{String(k + 1).padStart(2, '0')}</span>
                <Tile3D n={c.ico} color={k % 2 ? CYAN : BLUE} size={44} />
                <b>{c.k}</b>
                <span className="mr-line">{c.line}</span>
                <span className="mr-count"><strong>{fmt(c.n)}</strong><small>{c.unit}</small></span>
                <span className={`mr-status ${state}`}><i />{state === 'done' ? 'Complete' : state === 'run' ? 'Processing' : 'Queued'}</span>
              </button>
              <span id={`cl-tip-${k}`} role="tooltip" className="mr-tip">
                <b>{c.k} · rule</b>{c.rule}
              </span>
            </li>
          )
        })}
      </ol>

      <div className="mr-clean-grid">
        <div className="mr-sub">
          <div className="mr-sub-head">
            <p className="mono-label">Before / after</p>
            <button className="mr-mini-btn" onClick={() => setRun((r) => r + 1)}>Replay</button>
          </div>
          <p className="mr-rec-label">Raw record</p>
          <code className="mr-rec raw"><span>lucknow ,</span> <span>TATA POWER ,</span> <em>lat=999</em></code>
          <div className="mr-steps" aria-hidden="true">
            {['trim + title-case', 'operator map', 'bounds check'].map((x, i) => <span key={`${x}${run}`} style={{ animationDelay: `${i * 0.35}s` }}>{x}</span>)}
            <Glyph n="std" size={16} />
          </div>
          <p className="mr-rec-label">Cleaned record</p>
          <code key={run} className="mr-rec clean"><span style={{ animationDelay: '.1s' }}>Lucknow</span> · <span style={{ animationDelay: '.45s' }}>Tata Power</span> · <em style={{ animationDelay: '.8s' }}>coordinate flagged</em></code>
          <p className="mr-note">The record is kept and tagged, never deleted. Analysts can filter it or send it for review.</p>
        </div>

        <div className="mr-sub">
          <p className="mono-label">Quality-flag examples</p>
          <div className="mr-flags" role="group" aria-label="Quality flags">
            {QFLAGS.map(([f, , c], i) => (
              <button key={f} className={flagTip === i ? 'on' : ''} style={{ ['--k' as string]: c }} onMouseEnter={() => setFlagTip(i)} onFocus={() => setFlagTip(i)} onClick={() => setFlagTip(i)}>{f}</button>
            ))}
          </div>
          <p className="mr-flag-desc" aria-live="polite" style={{ ['--k' as string]: QFLAGS[flagTip][2] }}>{QFLAGS[flagTip][1]}</p>
        </div>

        <div className="mr-term" role="group" aria-label="Provenance example">
          <div className="mr-term-bar"><i /><i /><i /><span>provenance.record</span><em><b />provenance preserved</em></div>
          <pre>
            <span className="t-dim"># every cleaned record carries its lineage</span>{'\n'}
            <span className="t-key">source_system</span>{'      = '}<span className="t-str">VAHAN</span>{'\n'}
            <span className="t-key">ingested_at</span>{'        = '}<span className="t-str">2026-10-27T00:00:00+05:30</span>{'\n'}
            <span className="t-key">data_quality_flag</span>{'  = '}<span className="t-ok">OK</span>
          </pre>
        </div>
      </div>
    </div>
  )
}

/* ───────────────────────── B. data integration ───────────────────────── */

type Hov = 'VAHAN' | 'BEE' | 'OCM' | 'CPO' | 'GIS' | 'JOIN' | null
const CH_FIELDS = ['Station name', 'Operator', 'Coordinates', 'Charger count', 'Connector type']

const SRC: { id: Exclude<Hov, 'JOIN' | null>; name: string; sub: string; ico: string; color: string; fields: string[]; out: number[] }[] = [
  { id: 'VAHAN', name: 'VAHAN / Parivahan', sub: 'EV registrations', ico: 'bolt', color: BLUE, fields: ['Fuel type', 'Vehicle category', 'State / UT', 'Period'], out: [0] },
  { id: 'BEE', name: 'BEE EV Yatra', sub: 'Public charging stations', ico: 'pin', color: CYAN, fields: CH_FIELDS, out: [1] },
  { id: 'OCM', name: 'Open Charge Map', sub: 'Open charger registry', ico: 'globe', color: VIOLET, fields: CH_FIELDS, out: [1] },
  { id: 'CPO', name: 'CPO APIs', sub: 'Operator charging locations', ico: 'route', color: GREEN, fields: CH_FIELDS, out: [1] },
  { id: 'GIS', name: 'Government GIS', sub: 'Boundaries and highways', ico: 'poly', color: AMBER, fields: ['District polygons', 'Highway geometry'], out: [2, 3] },
]
const LAYERS = [
  { k: 'Cleaning', ico: 'flag', cx: 300 },
  { k: 'Standardization', ico: 'std', cx: 430 },
  { k: 'Spatial Join', ico: 'join', cx: 560 },
  { k: 'Unified Dataset', ico: 'layers', cx: 690 },
]
const OUT = [
  { k: 'EV demand layer', ico: 'bolt' },
  { k: 'Charger supply layer', ico: 'pin' },
  { k: 'District boundary layer', ico: 'poly' },
  { k: 'Highway corridor layer', ico: 'road' },
  { k: 'Gap Score layer', ico: 'gauge' },
  { k: 'Recommendation layer', ico: 'rec' },
]
const JOIN_TEXT = 'Charger points are assigned to districts using point-in-polygon spatial join.'

const DISTRICTS = [
  { n: 'Lucknow', p: '10,8 90,6 100,70 40,85 8,60', c: [50, 45] },
  { n: 'Unnao', p: '90,6 170,10 160,75 100,70', c: [130, 40] },
  { n: 'Barabanki', p: '170,10 250,8 248,70 160,75', c: [208, 40] },
  { n: 'Raebareli', p: '8,60 40,85 100,70 105,132 8,134', c: [58, 104] },
  { n: 'Sultanpur', p: '100,70 160,75 165,132 105,132', c: [132, 104] },
  { n: 'Amethi', p: '160,75 248,70 250,132 165,132', c: [206, 102] },
]
const DCOL = [BLUE, CYAN, VIOLET, GREEN, AMBER, '#ff8ab0']
const PINS: [number, number, number][] = [[50, 35, 0], [72, 52, 0], [125, 38, 1], [142, 28, 1], [205, 36, 2], [226, 52, 2], [46, 106, 3], [82, 98, 3], [132, 100, 4], [204, 108, 5], [228, 94, 5]]
const HWY = '8,96 55,88 120,52 175,58 250,32'

const SY = [52, 156, 260, 364, 468]
const OY = [43, 130, 217, 303, 390, 477]
const UNI = { x: 745, y: 260 }

function IntegrationMap({ hov }: { hov: Hov }) {
  const gis = hov === 'GIS'
  const chg = hov === 'BEE' || hov === 'OCM' || hov === 'CPO'
  const join = hov === 'JOIN'
  const vah = hov === 'VAHAN'
  return (
    <svg viewBox="0 0 260 140" className="mr-map" role="img" aria-label="Map preview: six district polygons with charger pins inside them and one highway crossing several districts">
      <defs>
        <filter id="mr-glow"><feGaussianBlur stdDeviation="2.2" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
      </defs>
      {DISTRICTS.map((d, i) => (
        <g key={d.n}>
          <polygon points={d.p} className="mr-poly" style={{ fill: join ? DCOL[i] : vah ? BLUE : gis ? AMBER : CYAN, fillOpacity: join ? 0.3 : vah ? 0.1 + i * 0.07 : gis ? 0.2 : 0.07, stroke: gis ? AMBER : join ? DCOL[i] : 'color-mix(in srgb,var(--cyan) 45%,transparent)', strokeWidth: gis ? 1.6 : 1 }} />
          <text x={d.c[0]} y={d.c[1] + 14} textAnchor="middle" className="mr-poly-label">{d.n}</text>
        </g>
      ))}
      <polyline points={HWY} className="mr-hwy-band" />
      <polyline points={HWY} className={`mr-hwy ${gis ? 'hot' : ''}`} filter={gis ? 'url(#mr-glow)' : undefined} />
      {join && PINS.map(([x, y, d]) => <line key={`l${x}`} x1={x} y1={y} x2={DISTRICTS[d].c[0]} y2={DISTRICTS[d].c[1]} stroke={DCOL[d]} strokeDasharray="2 2" strokeOpacity=".8" />)}
      {PINS.map(([x, y, d], i) => (
        <g key={i} className={chg || join ? 'mr-pin hot' : 'mr-pin'} style={{ ['--pc' as string]: join ? DCOL[d] : CYAN }}>
          <circle cx={x} cy={y} r="7" className="mr-pin-ring" />
          <circle cx={x} cy={y} r="3.2" />
        </g>
      ))}
    </svg>
  )
}

export function IntegrationFlow() {
  const [hov, setHov] = useState<Hov>(null)
  const src = SRC.find((s) => s.id === hov)
  const hotOut = (j: number) => !hov || (src ? src.out.includes(j) : hov === 'JOIN' && j >= 2)
  const srcHot = (s: (typeof SRC)[number]) => hov === s.id || (hov === 'JOIN' && (s.id === 'GIS' || s.id === 'BEE' || s.id === 'OCM' || s.id === 'CPO'))

  const bind = (h: Hov) => ({ onMouseEnter: () => setHov(h), onMouseLeave: () => setHov(null), onFocus: () => setHov(h), onBlur: () => setHov(null) })

  const info = src
    ? { title: src.name, sub: src.sub, items: src.fields, color: src.color, text: src.id === 'GIS' ? 'These geometries drive the district and highway layers.' : src.id === 'VAHAN' ? 'These registration fields build the EV demand layer.' : 'These charger fields build the supply layer. BEE, Open Charge Map and CPO records are cross-checked and deduplicated.' }
    : hov === 'JOIN'
      ? { title: 'Spatial Join', sub: 'Processing layer', items: ['Charger points', 'District polygons'], color: VIOLET, text: JOIN_TEXT }
      : null

  return (
    <div className="mr-panel mr-int">
      <div className="mr-motes" aria-hidden="true">{Array.from({ length: 12 }, (_, i) => <i key={i} style={{ left: `${(i * 41) % 100}%`, top: `${(i * 61) % 100}%`, animationDelay: `${-i * 0.9}s` }} />)}</div>
      <header className="mr-panel-head">
        <div>
          <p className="mono-label" style={{ color: CYAN }}>Live national data backbone</p>
          <h3>Five sources, one unified EV-charging dataset</h3>
        </div>
        <span className="mr-live"><i />5 adapters streaming</span>
      </header>

      <div className="mr-int-wrap">
        <div className="mr-int-canvas">
          <svg viewBox="0 0 1000 520" preserveAspectRatio="none" className="mr-int-svg" aria-hidden="true">
            <defs>
              {SRC.map((s, i) => <path key={s.id} id={`mr-p-${s.id}`} d={`M190,${SY[i]} C228,${SY[i]} 214,260 252,260`} />)}
              <path id="mr-p-chain" d="M252,260 L635,260" />
              {OY.map((y, j) => <path key={j} id={`mr-o-${j}`} d={`M${UNI.x},${UNI.y} C778,${UNI.y} 768,${y} 800,${y}`} />)}
            </defs>
            {SRC.map((s) => {
              const hot = srcHot(s)
              return (
                <g key={s.id} style={{ color: s.color, opacity: hov && !hot ? 0.18 : 1, transition: 'opacity .3s' }}>
                  <use href={`#mr-p-${s.id}`} className={`mr-link ${hot ? 'hot' : ''}`} stroke={s.color} />
                  {[0, 1].map((k) => <circle key={k} r={hot ? 4.5 : 3} fill={s.color}><animateMotion dur={hot ? '1.6s' : '3.2s'} begin={`${-k * 1.6}s`} repeatCount="indefinite"><mpath href={`#mr-p-${s.id}`} /></animateMotion></circle>)}
                </g>
              )
            })}
            <use href="#mr-p-chain" className="mr-link chain" />
            {[0, 1, 2].map((k) => <circle key={k} r="3.5" fill={CYAN}><animateMotion dur="3.6s" begin={`${-k * 1.2}s`} repeatCount="indefinite"><mpath href="#mr-p-chain" /></animateMotion></circle>)}
            {OY.map((_, j) => {
              const on = hotOut(j)
              return (
                <g key={j} style={{ opacity: on ? 1 : 0.15, transition: 'opacity .3s' }}>
                  <use href={`#mr-o-${j}`} className={`mr-link out ${on && hov ? 'hot' : ''}`} stroke={BLUE} />
                  <circle r="3" fill={GREEN}><animateMotion dur="2.4s" begin={`${-j * 0.4}s`} repeatCount="indefinite"><mpath href={`#mr-o-${j}`} /></animateMotion></circle>
                </g>
              )
            })}
          </svg>

          <ul className="mr-int-col mr-int-src" aria-label="Data sources">
            {SRC.map((s, i) => (
              <li key={s.id} style={{ top: `${(SY[i] / 520) * 100}%` }}>
                <button className={`mr-node ${srcHot(s) ? 'hot' : ''} ${hov && !srcHot(s) ? 'dim' : ''}`} style={{ ['--k' as string]: s.color }} {...bind(s.id)}>
                  <Tile3D n={s.ico} color={s.color} size={34} />
                  <span><b>{s.name}</b><small>{s.sub}</small></span>
                </button>
              </li>
            ))}
          </ul>

          <ol className="mr-int-layers" aria-label="Processing layers">
            {LAYERS.map((l, i) => {
              const isJoin = l.k === 'Spatial Join'
              const uni = i === 3
              return (
                <li key={l.k} style={{ left: `${l.cx / 10}%` }} className={uni ? 'uni' : ''}>
                  <button className={`mr-layer ${uni ? 'uni' : ''} ${hov === 'JOIN' && isJoin ? 'hot' : ''}`} {...(isJoin ? bind('JOIN') : {})} tabIndex={isJoin ? 0 : -1} aria-describedby={isJoin ? 'mr-join-tip' : undefined}>
                    <Glyph n={l.ico} size={uni ? 24 : 20} />
                    <span>{l.k}</span>
                  </button>
                  {isJoin && <span id="mr-join-tip" role="tooltip" className={`mr-tip join ${hov === 'JOIN' ? 'on' : ''}`}>{JOIN_TEXT}</span>}
                </li>
              )
            })}
          </ol>

          <ul className="mr-int-col mr-int-out" aria-label="Outputs">
            {OUT.map((o, j) => (
              <li key={o.k} style={{ top: `${(OY[j] / 520) * 100}%` }}>
                <span className={`mr-out ${hov && !hotOut(j) ? 'dim' : ''} ${hov && hotOut(j) ? 'hot' : ''}`}><Glyph n={o.ico} size={16} />{o.k}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="mr-int-stack">
          <ul className="mr-stack-src">{SRC.map((s) => <li key={s.id}><button className={`mr-node ${srcHot(s) ? 'hot' : ''}`} style={{ ['--k' as string]: s.color }} {...bind(s.id)} onClick={() => setHov(s.id)}><Tile3D n={s.ico} color={s.color} size={32} /><span><b>{s.name}</b><small>{s.sub}</small></span></button></li>)}</ul>
          <ol className="mr-stack-chain">{LAYERS.map((l, i) => <li key={l.k} className={i === 3 ? 'uni' : ''}><Glyph n={l.ico} size={16} />{l.k}</li>)}</ol>
          <ul className="mr-stack-out">{OUT.map((o) => <li key={o.k}><Glyph n={o.ico} size={14} />{o.k}</li>)}</ul>
        </div>
      </div>

      <div className="mr-int-detail">
        <div className="mr-sub" aria-live="polite">
          <p className="mono-label" style={{ color: info?.color ?? undefined }}>{info ? `${info.title} · ${info.sub}` : 'Hover a source or the spatial join'}</p>
          <div className="mr-fields">
            {(info?.items ?? ['Fuel type', 'Station name', 'District polygons', 'Highway geometry']).map((f) => (
              <span key={f} className={info ? 'on' : ''} style={{ ['--k' as string]: info?.color ?? CYAN }}>{f}</span>
            ))}
          </div>
          <p className="mr-note">{info?.text ?? 'Hover VAHAN for registration fields, BEE, Open Charge Map or CPO for charger fields, Government GIS for boundaries, or Spatial Join for how chargers meet districts.'}</p>
        </div>
        <div className="mr-sub mr-map-card">
          <p className="mono-label">Map preview · illustrative geometry</p>
          <IntegrationMap hov={hov} />
          <p className="mr-legend"><span><i style={{ background: CYAN }} />Charger pins</span><span><i style={{ background: '#fff', height: 3 }} />Highway</span><span><i style={{ background: AMBER, opacity: 0.6 }} />District polygons</span></p>
        </div>
      </div>
    </div>
  )
}
