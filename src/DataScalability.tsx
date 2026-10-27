import { useEffect, useRef, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { Icon } from './icons'
import { CountUp } from './Charts'
import { INDIA_PATH, px, py } from './decision-parts'
import './data-scalability.css'

type Vars = CSSProperties & Record<`--${string}`, string | number>
type Status = 'Live' | 'Scheduled' | 'Sample' | 'Fallback'

/* ---------- hooks ---------- */
function useInView<T extends HTMLElement>(threshold = 0.25) {
  const ref = useRef<T>(null)
  const [seen, setSeen] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (typeof IntersectionObserver === 'undefined') { setSeen(true); return }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setSeen(true); io.disconnect() } }, { threshold })
    io.observe(el)
    return () => io.disconnect()
  }, [threshold])
  return [ref, seen] as const
}

/* ---------- icons ---------- */
const IC: Record<string, ReactNode> = {
  vahan: <><path d="M6 3h9l4 4v14H6z" /><path d="M14 3v5h5" /><path d="M8.5 17h7M9.3 17l.9-3h3.6l.9 3" /><circle cx="10" cy="18.6" r=".6" /><circle cx="14" cy="18.6" r=".6" /></>,
  bee: <><rect x="4.5" y="3" width="9" height="16" rx="2" /><path d="M10.5 7l-2.5 4h3l-1.5 4" /><path d="M13.5 9h2a2 2 0 012 2v5a1.6 1.6 0 003.2 0V9" /><path d="M3 21h12" /></>,
  ocm: <><circle cx="11" cy="11" r="8" /><path d="M3 11h16M11 3c3 3 3 13 0 16M11 3c-3 3-3 13 0 16" /><path d="M18 22s-3.6-3-3.6-5.6a3.6 3.6 0 117.2 0C21.6 19 18 22 18 22z" fill="currentColor" fillOpacity=".25" /><circle cx="18" cy="16.4" r="1" /></>,
  cpo: <><path d="M9 3v5M15 3v5M6 8h12v3a6 6 0 01-12 0z" /><path d="M12 17v4" /><path d="M3 14h2M19 14h2" /></>,
  gis: <><path d="M12 3l9 5-9 5-9-5z" /><path d="M3 12.5l9 5 9-5" /><path d="M3 16.5l9 5 9-5" /></>,
  ingest: <><path d="M12 3v12M7 10l5 5 5-5M4 20h16" /></>,
  validate: <><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" /><path d="M8.5 12l2.5 2.5 4.5-5" /></>,
  standardize: <><path d="M4 7h16M7 12h10M10 17h4" /></>,
  geocode: <><path d="M12 21s-7-6-7-11a7 7 0 1114 0c0 5-7 11-7 11z" /><circle cx="12" cy="10" r="2.5" /></>,
  dedupe: <><rect x="8" y="8" width="12" height="12" rx="2" /><path d="M5 16V5h11" /></>,
  join: <><path d="M3 7l6-3 6 3 6-3v13l-6 3-6-3-6 3z" /><path d="M9 4v13M15 7v13" /></>,
  analyze: <><path d="M4 20V10M10 20V4M16 20v-8M22 20H2" /></>,
  recommend: <><path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z" /></>,
  bolt: <><path d="M13 2L4 14h7l-1 8 9-12h-7z" /></>,
  db: <><ellipse cx="12" cy="6" rx="8" ry="3" /><path d="M4 6v6c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6" /></>,
  rocket: <><path d="M12 3c4 1 6 5 6 9l-3 3H9l-3-3c0-4 2-8 6-9z" /><circle cx="12" cy="10" r="1.6" /><path d="M9 18l-2 3M15 18l2 3" /></>,
  layers: <><path d="M12 3l9 5-9 5-9-5z" /><path d="M3 13l9 5 9-5" /></>,
  grid: <><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></>,
}
function Glyph({ k, size = 26 }: { k: string, size?: number }) {
  return <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{IC[k]}</svg>
}
function Tile3D({ k, color, size = 52 }: { k: string, color: string, size?: number }) {
  return <span className="ds-tile" style={{ '--k': color, '--sz': `${size}px` } as Vars} aria-hidden="true">
    <i style={{ transform: 'translateZ(-3px)' }} /><i style={{ transform: 'translateZ(-6px)' }} /><i style={{ transform: 'translateZ(-9px)' }} />
    <span className="ds-tile-face"><Glyph k={k} size={Math.round(size * 0.5)} /></span>
  </span>
}

/* ---------- data ---------- */
const BLUE = '#4d8dff', ORANGE = '#ff9a4b'
type Source = { id: string, short: string, name: string, icon: string, color: string, desc: string, fields: string[], access: string, refresh: string, status: string, quality: number, hero: Status, provided: string, x: number, y: number }
const SOURCES: Source[] = [
  { id: 'vahan', short: 'VAHAN', name: 'VAHAN / Parivahan', icon: 'vahan', color: BLUE, desc: 'EV vehicle-registration analytics by fuel type, vehicle category, state/UT, district, and time period.', fields: ['State/UT', 'District', 'Fuel type', 'Vehicle category', 'Registration count', 'Period'], access: 'Dashboard reports, configurable API, CSV ingestion', refresh: 'Monthly / financial-year', status: 'Configurable', quality: 99.1, hero: 'Scheduled', provided: 'EV registrations by fuel, category, district and period', x: 130, y: 150 },
  { id: 'bee', short: 'BEE', name: 'BEE EV Yatra', icon: 'bee', color: '#3fd8f5', desc: 'Public charging stations, operators, locations, charger count, and connector details.', fields: ['Station name', 'Operator', 'City / district / state', 'Coordinates', 'Charging points', 'Connector type'], access: 'Public portal, station details, configurable feed', refresh: 'Scheduled', status: 'Connected / Sample fallback', quality: 96.4, hero: 'Live', provided: 'Public stations, operators, charging points, connectors', x: 130, y: 400 },
  { id: 'ocm', short: 'OCM', name: 'Open Charge Map', icon: 'ocm', color: '#9b8cff', desc: 'Open global registry of EV charging locations with operators, coordinates, and connector details.', fields: ['Station name', 'Operator', 'Location', 'Charger count', 'Connector type', 'Power (kW)'], access: 'REST POI API', refresh: 'On demand / scheduled', status: 'API key required', quality: 94.8, hero: 'Sample', provided: 'Open registry of charging POIs with power and connectors', x: 500, y: 58 },
  { id: 'cpo', short: 'CPO', name: 'CPO APIs', icon: 'cpo', color: '#35f5a1', desc: 'Operator-specific charging locations, EVSEs, connectors, power, and availability.', fields: ['Location', 'Operator', 'EVSE', 'Connector', 'Power (kW)', 'Status'], access: 'OCPI-style or custom REST API', refresh: 'Near real time', status: 'Ready for integration', quality: 97.6, hero: 'Sample', provided: 'EVSE-level locations, connectors, power and availability', x: 870, y: 150 },
  { id: 'gis', short: 'GIS', name: 'Government GIS', icon: 'gis', color: ORANGE, desc: 'Administrative boundaries, road networks, highways, and planning geographies.', fields: ['State / district boundaries', 'Highway geometry', 'Geography codes'], access: 'GeoJSON / GIS feed', refresh: 'Periodic', status: 'Connected / Sample fallback', quality: 98.7, hero: 'Fallback', provided: 'District and state boundaries, highway geometry, geography codes', x: 870, y: 400 },
]
const STATUS_COLOR: Record<Status, string> = { Live: '#35f5a1', Scheduled: '#4d8dff', Sample: '#ffb347', Fallback: '#ff9a4b' }

const SAMPLES: Record<string, { cols: string[], rows: string[][] }> = {
  vahan: { cols: ['State/UT', 'District', 'Fuel type', 'Vehicle category', 'Registrations', 'Period'], rows: [['Uttar Pradesh', 'Lucknow', 'Electric (BOV)', '2-Wheeler', '4,212', 'Sep 2026'], ['Uttar Pradesh', 'Gautam Buddha Nagar', 'Electric (BOV)', '4-Wheeler', '2,486', 'Sep 2026'], ['Uttar Pradesh', 'Kanpur Nagar', 'Electric (BOV)', '3-Wheeler', '1,903', 'Sep 2026'], ['Uttar Pradesh', 'Varanasi', 'Electric (BOV)', '2-Wheeler', '1,127', 'Sep 2026']] },
  bee: { cols: ['Station', 'Operator', 'District', 'Lat, Lon', 'Points', 'Connector'], rows: [['Gomti Nagar Hub', 'EESL', 'Lucknow', '26.85, 80.99', '6', 'CCS2 · Type 2 AC'], ['Sector 62 Fast Charge', 'Tata Power', 'Gautam Buddha Nagar', '28.62, 77.37', '8', 'CCS2 · CHAdeMO'], ['Kanpur Central', 'Statiq', 'Kanpur Nagar', '26.45, 80.35', '4', 'Type 2 AC'], ['Cantt Station', 'ChargeZone', 'Varanasi', '25.35, 82.99', '3', 'Bharat DC']] },
  ocm: { cols: ['Station', 'Operator', 'Location', 'Chargers', 'Connector', 'Power'], rows: [['Amar Shaheed Path', 'Jio-bp pulse', 'Lucknow', '4', 'CCS2', '60 kW'], ['Noida Expressway', 'Statiq', 'Noida', '6', 'CCS2', '120 kW'], ['Agra Fort Road', 'Tata Power', 'Agra', '2', 'Type 2 AC', '22 kW'], ['Civil Lines', 'ChargeZone', 'Prayagraj', '3', 'Bharat AC', '10 kW']] },
  cpo: { cols: ['Location', 'Operator', 'EVSE', 'Connector', 'Power', 'Status'], rows: [['Lucknow · Phoenix Mall', 'Tata Power', 'EVSE-0412-A', 'CCS2', '60 kW', 'AVAILABLE'], ['Ghaziabad · NH-9', 'ChargeZone', 'EVSE-0877-B', 'CCS2', '120 kW', 'CHARGING'], ['Kanpur · Z Square', 'Statiq', 'EVSE-0231-A', 'Type 2 AC', '22 kW', 'AVAILABLE'], ['Jhansi · NH-44', 'Jio-bp pulse', 'EVSE-1090-C', 'CCS2', '60 kW', 'OUT_OF_ORDER']] },
  gis: { cols: ['Layer', 'Feature', 'Code', 'Geometry', 'CRS', 'Vintage'], rows: [['Districts', 'Lucknow', 'UP-LKO', 'MultiPolygon', 'EPSG:4326', '2024'], ['Districts', 'Gautam Buddha Nagar', 'UP-GBN', 'MultiPolygon', 'EPSG:4326', '2024'], ['Highways', 'NH-44 · Jhansi–Kanpur', 'NH44-UP', 'LineString', 'EPSG:4326', '2025'], ['Highways', 'NH-9 · Ghaziabad–Lucknow', 'NH9-UP', 'LineString', 'EPSG:4326', '2025']] },
}

const STAGES = [
  { k: 'ingest', name: 'Ingest', desc: 'Fetch data from VAHAN, BEE, Open Charge Map, CPO, and GIS adapters.', n: 18450, unit: 'raw records', status: 'Complete', ex: ['5 adapters polled with retry and back-off', 'Raw payloads archived before any transform'] },
  { k: 'validate', name: 'Validate', desc: 'Check schema, coordinates, categories, dates, and record counts.', n: 17920, unit: 'passed', status: 'Complete', ex: ['Latitude 6–38 °N, longitude 68–98 °E', 'Dates parse; enums match; row counts reconcile'] },
  { k: 'standardize', name: 'Standardize', desc: 'Normalize state/district names, fuel types, vehicle categories, and connector types.', n: 17920, unit: 'normalized', status: 'Complete', ex: ['“Gautam Buddh Nagar” → “Gautam Buddha Nagar”', '“BEV” / “Electric” → Battery Electric Vehicle'] },
  { k: 'geocode', name: 'Geocode', desc: 'Assign coordinates where missing and validate location quality.', n: 17920, unit: 'located', status: 'Complete', ex: ['Address → coordinates; district centroid fallback', 'Quality grade: exact · street · district'] },
  { k: 'dedupe', name: 'Deduplicate', desc: 'Detect duplicate chargers across BEE, Open Charge Map, and CPO sources.', n: 17608, unit: 'unique', status: 'Complete', ex: ['Match within 75 m, same operator, name similarity ≥ 0.85', '312 duplicates merged; provenance kept'] },
  { k: 'join', name: 'Spatial Join', desc: 'Assign chargers to districts, states, and highway corridors.', n: 17608, unit: 'joined', status: 'Complete', ex: ['Point-in-polygon against district boundaries', '5 km buffer along NH / SH corridors'] },
  { k: 'analyze', name: 'Analyze', desc: 'Calculate EVs per charger, coverage, Gap Score, and charger requirements.', n: 75, unit: 'districts scored', status: 'Running', ex: ['EVs per charger = registered EVs ÷ public points', 'Gap Score weights 0.45 / 0.25 / 0.20 / 0.10'] },
  { k: 'recommend', name: 'Recommend', desc: 'Rank districts and identify priority charger locations.', n: 25, unit: 'priority sites', status: 'Queued', ex: ['Districts ranked by Gap Score', 'Candidate sites on corridor gaps and demand hotspots'] },
]

const ISSUES = [
  { k: 'Missing coordinates', n: 54, c: '#ff6b5f', d: 'No latitude/longitude supplied; geocoding was attempted.' },
  { k: 'Invalid coordinates', n: 31, c: '#ffb347', d: 'Outside India bounds or swapped latitude/longitude.' },
  { k: 'Duplicate suspect', n: 47, c: '#9b8cff', d: 'Probable repeat across BEE, Open Charge Map or CPO feeds.' },
  { k: 'Unmatched district', n: 26, c: '#4d8dff', d: 'Point falls outside every district boundary or name unmapped.' },
  { k: 'Stale record', n: 38, c: '#3fd8f5', d: 'Not refreshed within the source’s expected window.' },
  { k: 'Synthetic / sample record', n: 22, c: '#7f93b2', d: 'Sample data used while a live feed is not yet connected.' },
]

const PHASES = [
  { tag: 'Phase 1', name: 'Prototype', state: 'Current', icon: 'rocket', items: ['Sample / open data', 'Uttar Pradesh district-level analysis', 'Static or scheduled refresh', 'Prototype dashboard and GIS map'] },
  { tag: 'Phase 2', name: 'State Scale', state: 'Next', icon: 'layers', items: ['VAHAN report ingestion', 'BEE EV Yatra station data', 'Verified district boundaries', 'Scheduled automated refresh', 'State-level dashboards'] },
  { tag: 'Phase 3', name: 'National Scale', state: 'Planned', icon: 'db', items: ['Official government GIS feeds', 'CPO / OCPI integrations', 'PostgreSQL + PostGIS', 'Automated ingestion pipelines', 'National district and corridor analysis'] },
  { tag: 'Phase 4', name: 'Operational Platform', state: 'Target', icon: 'grid', items: ['Live charger availability', 'Grid-capacity integration', 'Role-based access', 'Forecast monitoring', 'Investment-planning workflows', 'Public-facing charger discovery'] },
]

const DICTIONARY = [
  ['source_system', 'string', 'Adapter key that produced the record', 'all'], ['source_station_id', 'string', 'Identifier assigned by the originating system', 'BEE / OCM / CPO'],
  ['source_url', 'string', 'Endpoint or page the record was read from', 'all'], ['ingested_at', 'timestamp (IST)', 'When the record entered the platform', 'all'],
  ['data_quality_flag', 'enum', 'OK, SAMPLE, MISSING_COORDS, INVALID_COORDS, DUPLICATE_SUSPECT, UNMATCHED_DISTRICT, STALE', 'all'],
  ['state_ut', 'string', 'Standardized State / UT name', 'all'], ['district', 'string', 'Standardized district name', 'all'],
  ['fuel_type', 'enum', 'Standardized fuel type (e.g. Battery Electric)', 'VAHAN'], ['vehicle_category', 'enum', '2W, 3W, 4W, bus, goods', 'VAHAN'], ['registration_count', 'integer', 'Registered EVs for the period', 'VAHAN'],
  ['station_name', 'string', 'Public name of the charging station', 'BEE / OCM'], ['operator', 'string', 'Charge-point operator', 'BEE / OCM / CPO'],
  ['latitude', 'decimal', 'WGS84 latitude', 'BEE / OCM / CPO'], ['longitude', 'decimal', 'WGS84 longitude', 'BEE / OCM / CPO'],
  ['charging_points', 'integer', 'Number of charging points at a location', 'BEE / OCM'], ['connector_type', 'enum', 'CCS2, Type 2 AC, Bharat AC, Bharat DC, CHAdeMO', 'BEE / OCM / CPO'],
  ['power_kw', 'decimal', 'Rated power in kilowatts', 'OCM / CPO'], ['evse_status', 'enum', 'AVAILABLE, CHARGING, OUT_OF_ORDER', 'CPO'],
  ['geography_code', 'string', 'District / state geography code', 'GIS'], ['geometry', 'GeoJSON', 'Polygon or line geometry', 'GIS'],
]

function SecHead({ kicker, title, sub, id }: { kicker: string, title: string, sub?: string, id?: string }) {
  return <div className="ds-sechead" id={id}><p className="mono-label text-brand">{kicker}</p><h2>{title}</h2>{sub && <p>{sub}</p>}</div>
}

/* ---------- hero ---------- */
function Hero({ ext }: { ext: string | null }) {
  const [loc, setHot] = useState<string | null>(null)
  const hot = loc ?? ext
  const core = { x: 500, y: 270 }
  const pathFor = (s: Source) => s.id === 'ocm' ? `M${s.x} ${s.y} L${core.x} ${core.y}` : `M${s.x} ${s.y} C${s.x + (core.x - s.x) * 0.6} ${s.y} ${s.x + (core.x - s.x) * 0.4} ${core.y} ${core.x} ${core.y}`
  return <section className="ds-hero" aria-label="Unified data backbone">
    <div className="ds-scene">
      <svg className="ds-lines" viewBox="0 0 1000 540" aria-hidden="true">
        <defs><filter id="dsGlow" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="3" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter></defs>
        {SOURCES.map(s => <path key={s.id} id={`dsp-${s.id}`} d={pathFor(s)} className={`ds-line ${hot === s.id ? 'hot' : ''} ${hot && hot !== s.id ? 'dim' : ''}`} style={{ stroke: s.color }} />)}
        {SOURCES.map((s, si) => <g key={s.id} fill={s.color} filter="url(#dsGlow)" opacity={hot && hot !== s.id ? 0.25 : 1}>
          {[0, 1, 2].map(i => <circle key={i} r={hot === s.id ? 4.5 : 3}><animateMotion dur={`${3.2 + si * 0.15}s`} begin={`${-i * 1.07}s`} repeatCount="indefinite"><mpath href={`#dsp-${s.id}`} /></animateMotion></circle>)}
          {hot === s.id && [0, 1, 2].map(i => <circle key={`h${i}`} r="3.5"><animateMotion dur="1.4s" begin={`${-i * 0.47}s`} repeatCount="indefinite"><mpath href={`#dsp-${s.id}`} /></animateMotion></circle>)}
        </g>)}
      </svg>

      <div className="ds-core">
        <div className="ds-core-3d">
          <svg className="ds-hex" viewBox="0 0 200 200" aria-hidden="true"><polygon points="100,6 181,53 181,147 100,194 19,147 19,53" /><polygon points="100,26 164,63 164,137 100,174 36,137 36,63" /></svg>
          <div className="ds-rings"><i /><i /><i /></div>
          <div className="ds-orb"><svg className="ds-orb-map" viewBox="0 0 190 198" aria-hidden="true"><path d={INDIA_PATH} /><g>{[[80.9, 26.8], [77.2, 28.6], [72.9, 19.1], [77.6, 13], [88.3, 22.6], [80.3, 13.1], [78.5, 17.4], [75.8, 26.9]].map(([lo, la], i) => <circle key={i} cx={px(lo)} cy={py(la)} r="3.2" style={{ animationDelay: `${-i * 0.3}s` }} />)}</g></svg></div>
        </div>
        <div className="ds-core-label"><b>Unified EV Charging Intelligence Layer</b><span><i />18,450 records · 5 adapters · 1 schema</span></div>
      </div>

      {SOURCES.map(s => <div key={s.id} className={`ds-node ${s.x < 400 ? 'at-left' : s.x > 600 ? 'at-right' : 'at-top'} ${s.y > 300 ? 'tip-up' : ''} ${hot === s.id ? 'on' : ''}`} style={{ left: `${s.x / 10}%`, top: `${(s.y / 540) * 100}%`, '--k': s.color, '--d': SOURCES.indexOf(s) } as Vars}>
        <button className="ds-node-btn" onMouseEnter={() => setHot(s.id)} onMouseLeave={() => setHot(null)} onFocus={() => setHot(s.id)} onBlur={() => setHot(null)} aria-describedby={`tip-${s.id}`}>
          <Tile3D k={s.icon} color={s.color} size={50} />
          <span><b>{s.name}</b><em><i style={{ background: STATUS_COLOR[s.hero] }} />{s.hero}</em></span>
        </button>
        <div className="ds-tip" role="tooltip" id={`tip-${s.id}`}>
          <p className="mono-label" style={{ color: s.color }}>Source adapter</p><h4>{s.name}</h4>
          <dl><dt>Data provided</dt><dd>{s.provided}</dd><dt>Access method</dt><dd>{s.access}</dd><dt>Refresh</dt><dd>{s.refresh}</dd><dt>Status</dt><dd><span className="ds-chip" style={{ '--k': STATUS_COLOR[s.hero] } as Vars}>{s.hero}</span></dd></dl>
        </div>
      </div>)}
    </div>
  </section>
}

/* ---------- adapter cards ---------- */
function AdapterCard({ s, onConfig, onSample, onHover }: { s: Source, onConfig: () => void, onSample: () => void, onHover: (id: string | null) => void }) {
  const warn = s.status.includes('required')
  const sample = SAMPLES[s.id]
  return <article className="ds-card" style={{ '--k': s.color } as Vars} onMouseEnter={() => onHover(s.id)} onMouseLeave={() => onHover(null)} onFocus={() => onHover(s.id)} onBlur={() => onHover(null)}>
    <div className="ds-card-tip" role="tooltip"><p className="mono-label" style={{ color: s.color }}>Sample record · {s.short}</p><dl>{sample.cols.map((c, i) => <div key={c}><dt>{c}</dt><dd>{sample.rows[0][i]}</dd></div>)}</dl></div>
    <header><Tile3D k={s.icon} color={s.color} size={54} /><div><h3>{s.name}</h3><span className={`ds-chip ${warn ? 'warn' : ''}`} style={{ '--k': warn ? '#ffb347' : s.color } as Vars}>{s.status}</span></div></header>
    <p className="ds-card-desc">{s.desc}</p>
    <div><p className="mono-label">Data fields provided</p><ul className="ds-fields">{s.fields.map(f => <li key={f}>{f}</li>)}</ul></div>
    <dl className="ds-meta"><dt>Access</dt><dd>{s.access}</dd><dt>Update frequency</dt><dd>{s.refresh}</dd></dl>
    <div className="ds-quality"><div><span>Data-quality · schema pass rate</span><b>{s.quality}%</b></div><div className="ds-qbar"><span style={{ width: `${s.quality}%` }} /></div></div>
    <footer><button className="btn-primary" onClick={onConfig}>Configure Adapter</button><button className="btn-ghost" onClick={onSample}>View Sample Records</button></footer>
  </article>
}

function Modal({ children, onClose, title }: { children: ReactNode, onClose: () => void, title: string }) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])
  return <div className="ds-modal-bg" onMouseDown={onClose}><div className="ds-modal glass" role="dialog" aria-modal="true" aria-label={title} onMouseDown={e => e.stopPropagation()}>
    <button className="ds-modal-x" onClick={onClose} aria-label="Close"><Icon name="close" size={16} /></button>{children}</div></div>
}
function ConfigForm({ s, onClose, onSaved }: { s: Source, onClose: () => void, onSaved: (m: string) => void }) {
  const needsKey = s.id === 'ocm' || s.id === 'cpo'
  const [fallback, setFallback] = useState(true)
  const [result, setResult] = useState<string | null>(null)
  const test = () => setResult(needsKey ? 'No API key supplied — adapter will serve sample records while fallback is on.' : s.id === 'vahan' ? 'Report export reachable — schema check passed on 12 sample rows.' : 'Feed reachable — schema check passed on sample rows.')
  return <>
    <p className="mono-label" style={{ color: s.color }}>Configure adapter</p><h3>{s.name}</h3>
    <div className="ds-form">
      <label>Source endpoint<input defaultValue={s.id === 'vahan' ? 'Report export · state/district/fuel' : s.id === 'ocm' ? 'REST POI API · country = IN' : s.id === 'cpo' ? 'OCPI 2.2 locations module' : s.id === 'gis' ? 'GeoJSON feed · districts + highways' : 'Station details feed'} /></label>
      <label>Authentication<select defaultValue={needsKey ? 'API key' : 'None (public)'}><option>None (public)</option><option>API key</option><option>OAuth 2.0 client credentials</option></select></label>
      {needsKey && <label>API key<input type="password" placeholder="Paste key to go live" autoComplete="off" /></label>}
      <label>Refresh schedule<select defaultValue={s.refresh.includes('real') ? 'Every 5 minutes' : s.refresh.includes('Monthly') ? 'Monthly' : 'Daily · 12:00 AM IST'}><option>Every 5 minutes</option><option>Daily · 12:00 AM IST</option><option>Weekly</option><option>Monthly</option><option>On demand</option></select></label>
      <label className="ds-switch"><input type="checkbox" checked={fallback} onChange={e => setFallback(e.target.checked)} /><span /> Fall back to sample records when the source is unavailable</label>
    </div>
    {result && <p className="ds-result" role="status">{result}</p>}
    <div className="ds-modal-actions"><button className="btn-ghost" onClick={test}>Test connection</button><button className="btn-primary" onClick={() => { onSaved(`${s.name} adapter configuration saved (prototype).`); onClose() }}>Save configuration</button></div>
  </>
}
function SampleTable({ s }: { s: Source }) {
  const t = SAMPLES[s.id]
  return <>
    <p className="mono-label" style={{ color: s.color }}>Sample records · illustrative</p><h3>{s.name}</h3>
    <div className="ds-table-wrap"><table className="ds-table"><thead><tr>{t.cols.map(c => <th key={c}>{c}</th>)}</tr></thead><tbody>{t.rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j}>{c}</td>)}</tr>)}</tbody></table></div>
    <p className="ds-note">Records are examples of the normalized schema. Each is stored with source_system, source_station_id, source_url, ingested_at and data_quality_flag.</p>
  </>
}

/* ---------- pipeline ---------- */
function Pipeline() {
  const [ref, seen] = useInView<HTMLDivElement>(0.2)
  const [lit, setLit] = useState(0)
  const [hover, setHover] = useState<number | null>(null)
  useEffect(() => {
    if (!seen || hover !== null) return
    const t = setInterval(() => setLit(l => (l + 1) % STAGES.length), 1300)
    return () => clearInterval(t)
  }, [seen, hover])
  const cur = hover ?? lit
  return <div className="ds-pipeline" ref={ref}>
    <ol>
      {STAGES.map((s, i) => <li key={s.k} className={`${cur === i ? 'lit' : ''} ${hover === i ? 'hover' : ''} ${i < cur ? 'passed' : ''}`} style={{ '--i': i } as Vars}>
        <button onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} onFocus={() => setHover(i)} onBlur={() => setHover(null)}>
          <span className="ds-stage-idx">0{i + 1}</span>
          <Tile3D k={s.k} color={i < 4 ? '#3fd8f5' : i < 6 ? '#9b8cff' : '#35f5a1'} size={46} />
          <h4>{s.name}</h4>
          <p className="ds-stage-desc">{s.desc}</p>
          <div className="ds-stage-count"><b>{seen ? <CountUp to={s.n} /> : 0}</b><small>{s.unit}</small></div>
          <span className={`ds-stage-status ${s.status.toLowerCase()}`}><i />{s.status}</span>
          <span className="ds-stage-pop" role="tooltip"><b>{s.name}</b>{s.desc}<em>Example checks / outputs</em>{s.ex.map(x => <span key={x}>{x}</span>)}{s.k === 'join' && <svg className="ds-join-map" viewBox="0 0 190 198" aria-hidden="true"><path d={INDIA_PATH} className="jm-india" />{[[80.9, 26.8, 0], [78.0, 27.9, 1], [83.0, 25.4, 2]].map(([lo, la, i]) => <polygon key={i} className="jm-dist" style={{ animationDelay: `${-i * 0.9}s` }} points={[[-5, -6], [5, -7], [8, 2], [0, 7], [-7, 3]].map(([dx, dy]) => `${Number(px(lo)) + dx * 1.6},${Number(py(la)) + dy * 1.6}`).join(' ')} />)}{[[79.6, 28.9, 1], [81.5, 27.4, 0], [78.4, 27.2, 1], [82.6, 26.3, 2], [83.6, 24.9, 2], [80.4, 26.2, 0]].map(([lo, la, i], k) => <circle key={k} className="jm-pin" cx={px(lo)} cy={py(la)} r="3" style={{ animationDelay: `${-k * 0.35}s` }} />)}</svg>}</span>
        </button>
      </li>)}
    </ol>
  </div>
}

/* ---------- quality ---------- */
const SPARK = [[4, 6, 5, 8, 7, 10, 9, 12], [4, 5, 6, 7, 7, 9, 10, 11], [9, 8, 8, 6, 7, 5, 4, 4], [8, 9, 7, 8, 6, 6, 5, 5]]
function Spark({ d, c }: { d: number[], c: string }) {
  const pts = d.map((v, i) => `${(i * 100) / (d.length - 1)},${28 - v * 2}`).join(' ')
  return <svg viewBox="0 0 100 30" preserveAspectRatio="none" className="ds-spark" aria-hidden="true"><polyline points={pts} fill="none" stroke={c} strokeWidth="2" vectorEffect="non-scaling-stroke" /><polyline points={`0,30 ${pts} 100,30`} fill={c} opacity=".13" /></svg>
}
function Quality() {
  const [ref, seen] = useInView<HTMLDivElement>(0.2)
  const [hi, setHi] = useState<number | null>(null)
  const total = ISSUES.reduce((a, b) => a + b.n, 0)
  const kpis = [['Records Ingested', 18450, 'across 5 adapters', '#4d8dff'], ['Records Validated', 17920, '97.1% pass rate', '#35f5a1'], ['Duplicates Resolved', 312, 'merged across BEE · OCM · CPO', '#9b8cff'], ['Issues Flagged', 218, '1.2% of records need review', '#ff9a4b']] as const
  return <div ref={ref} className={`ds-q ${seen ? 'seen' : ''}`}>
    <div className="ds-kpis">{kpis.map(([t, v, s, c], i) => <article key={t} className="ds-kpi" style={{ '--k': c } as Vars}><p className="mono-label">{t}</p><strong>{seen ? <CountUp to={v} /> : 0}</strong><small>{s}</small><Spark d={SPARK[i]} c={c} /></article>)}</div>
    <div className="ds-qgrid">
      <div className="glass ds-issues">
        <div className="ds-issues-head"><div><p className="mono-label text-brand">Issue breakdown</p><h3>218 flagged records by cause</h3></div><span className="ds-chip" style={{ '--k': '#35f5a1' } as Vars}>All flagged, none dropped silently</span></div>
        <div className="ds-stack" onMouseLeave={() => setHi(null)}>
          {ISSUES.map((x, i) => <button key={x.k} className={hi === i ? 'on' : hi !== null ? 'dim' : ''} style={{ flexGrow: seen ? x.n : 0, '--k': x.c, '--i': i } as Vars} onMouseEnter={() => setHi(i)} onFocus={() => setHi(i)} onBlur={() => setHi(null)} aria-label={`${x.k}: ${x.n}`}>
            <span className="ds-stack-tip"><b>{x.k}</b>{x.n} records · {((x.n / total) * 100).toFixed(1)}%<small>{x.d}</small></span>
          </button>)}
        </div>
        <ul className="ds-legend">{ISSUES.map((x, i) => <li key={x.k} className={hi === i ? 'on' : ''} onMouseEnter={() => setHi(i)} onMouseLeave={() => setHi(null)}><i style={{ background: x.c }} /><span>{x.k}</span><b>{x.n}</b><em>{((x.n / total) * 100).toFixed(0)}%</em></li>)}</ul>
      </div>
      <div className="glass ds-term" aria-label="Provenance record example">
        <div className="ds-term-bar"><i /><i /><i /><span>provenance.log</span><em><b />provenance preserved</em></div>
        <pre>
          <code>
            <span className="t-dim">$ adapters.ingest --source vahan --state UP{'\n'}</span>
            <span className="t-dim"># Every record retains:{'\n'}</span>
            {'{\n'}
            {[['source_system', 'VAHAN'], ['source_record_id', 'VH-2026-09-UP094'], ['ingested_at', '2026-10-27T00:00:00+05:30'], ['data_quality_flag', 'OK'], ['provenance', 'preserved']].map(([k, v], i) => <span key={k} className="t-line" style={{ '--i': i } as Vars}>{'  '}<span className="t-key">"{k}"</span>: <span className="t-str">"{v}"</span>{i < 4 ? ',' : ''}{'\n'}</span>)}
            {'}\n'}
            <span className="t-ok">✓ 18,450 / 18,450 records carry full provenance{'\n'}</span>
          </code>
        </pre>
        <div className="ds-flags">{['OK', 'SAMPLE', 'MISSING_COORDS', 'DUPLICATE_SUSPECT', 'STALE'].map(f => <span key={f}>{f}</span>)}</div>
      </div>
    </div>
  </div>
}

/* ---------- roadmap ---------- */
function Roadmap() {
  const [ref, seen] = useInView<HTMLDivElement>(0.25)
  return <div className={`ds-roadmap ${seen ? 'seen' : ''}`} ref={ref}>
    <div className="ds-rail" aria-hidden="true"><span /></div>
    <ol>{PHASES.map((p, i) => <li key={p.tag} className={`ph-${p.state.toLowerCase()}`} style={{ '--i': i } as Vars}>
      <span className="ds-ms" aria-hidden="true" />
      <article>
        <header><Tile3D k={p.icon} color={i === 0 ? '#35f5a1' : i === 1 ? '#3fd8f5' : i === 2 ? '#9b8cff' : '#4d8dff'} size={44} /><div><p className="mono-label">{p.tag}</p><h3>{p.name}</h3></div><span className="ds-phase-state">{p.state}</span></header>
        <ul>{p.items.map(it => <li key={it}>{it}</li>)}</ul>
      </article>
    </li>)}</ol>
  </div>
}

/* ---------- architecture ---------- */
function hl(line: string): ReactNode[] {
  const re = /(#.*$)|("[^"]*")|\b(class|def|return)\b|\b(DataSourceAdapter|NewStateAdapter|registry|normalized_records)\b/g
  const out: ReactNode[] = []; let last = 0, m: RegExpExecArray | null, k = 0
  while ((m = re.exec(line))) {
    if (m.index > last) out.push(line.slice(last, m.index))
    const cls = m[1] ? 'c-com' : m[2] ? 'c-str' : m[3] ? 'c-kw' : 'c-id'
    out.push(<span key={k++} className={cls}>{m[0]}</span>); last = m.index + m[0].length
  }
  out.push(line.slice(last)); return out
}
const CODE = `class NewStateAdapter(DataSourceAdapter):
    source_key = "new_state"
    display_name = "New State EV Data"

    def fetch(self):
        return normalized_records()

registry.register(
    "new_state",
    NewStateAdapter.display_name,
    NewStateAdapter
)`
function Architecture() {
  const [ref, seen] = useInView<HTMLDivElement>(0.2)
  const chain = [['Normalized Records', 'db'], ['Validation', 'validate'], ['Spatial Join', 'join'], ['Analytics', 'analyze'], ['Dashboard', 'grid']]
  return <div className={`ds-arch ${seen ? 'seen' : ''}`} ref={ref}>
    <div className="glass ds-arch-diagram">
      <div className="ds-arch-adapters">
        {SOURCES.map(s => <div key={s.id} className="ds-arch-node" style={{ '--k': s.color } as Vars}><Glyph k={s.icon} size={18} /><span>{s.id === 'ocm' ? 'OpenChargeMap' : s.id === 'gis' ? 'Government GIS' : `${s.short} Adapter`}</span></div>)}
      </div>
      <svg className="ds-fan" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        {SOURCES.map((s, i) => <path key={s.id} d={`M0 ${(i + 0.5) * 20} C55 ${(i + 0.5) * 20} 45 50 100 50`} style={{ stroke: s.color }} vectorEffect="non-scaling-stroke" />)}
      </svg>
      <div className="ds-arch-chain">
        {chain.map(([n, ic], i) => <div key={n} className="ds-arch-step"><div className={`ds-arch-node big ${i === 0 ? 'core' : ''}`} style={{ '--k': i === 0 ? '#3fd8f5' : i === 4 ? '#35f5a1' : '#9b8cff' } as Vars}><Glyph k={ic} size={22} /><span>{n}</span></div>{i < chain.length - 1 && <span className="ds-arrow" aria-hidden="true"><i /></span>}</div>)}
      </div>
    </div>
    <div className="ds-arch-side">
      <div className="ds-callout"><Icon name="check" size={18} /><p>Adding a new data source requires only a new adapter.<br /><b>No changes are required in the core analytics or dashboard pipeline.</b></p></div>
      <div className="glass ds-code"><div className="ds-term-bar"><i /><i /><i /><span>adapters/new_state.py</span></div><pre><code>{CODE.split('\n').map((l, i) => <span key={i}>{hl(l)}{'\n'}</span>)}</code></pre></div>
    </div>
  </div>
}

/* ---------- operational readiness ---------- */
const ARC_PTS: [string, number, number, string][] = [['Delhi · Parivahan / BEE', 77.2, 28.6, '#4d8dff'], ['Bengaluru · CPO', 77.6, 12.97, '#35f5a1'], ['Mumbai · CPO', 72.9, 19.1, '#35f5a1'], ['Dehradun · Survey of India', 78.0, 30.3, '#ff9a4b'], ['Kolkata · OCM relay', 88.4, 22.6, '#9b8cff']]
function Globe() {
  const hub = [Number(px(80.95)), Number(py(26.85))]
  return <svg className="ds-globe" viewBox="0 0 300 300" role="img" aria-label="Globe with India highlighted and data arcs flowing into the Uttar Pradesh platform hub">
    <defs><radialGradient id="gSph" cx="35%" cy="30%"><stop offset="0" stopColor="#2b5f93" /><stop offset=".6" stopColor="#0d1f3d" /><stop offset="1" stopColor="#060d1c" /></radialGradient><clipPath id="gClip"><circle cx="150" cy="150" r="140" /></clipPath></defs>
    <circle cx="150" cy="150" r="146" fill="none" stroke="#3fd8f5" strokeOpacity=".25" strokeDasharray="2 5" className="ds-globe-halo" />
    <circle cx="150" cy="150" r="140" fill="url(#gSph)" />
    <g clipPath="url(#gClip)" fill="none" stroke="#6fd6ee" strokeOpacity=".22">
      {[-90, -60, -30, 0, 30, 60, 90].map(y => <ellipse key={y} cx="150" cy={150 + y * 1.4} rx={Math.sqrt(Math.max(140 ** 2 - (y * 1.4) ** 2, 0))} ry="6" />)}
      {[0, 1, 2, 3].map(i => <ellipse key={i} cx="150" cy="150" rx="140" ry="140"><animate attributeName="rx" values={`${i * 35};140;${i * 35}`} dur={`${8 + i}s`} repeatCount="indefinite" /></ellipse>)}
      <g transform="translate(52 46) scale(.97)" strokeOpacity="1">
        <path d={INDIA_PATH} fill="#3fd8f5" fillOpacity=".25" stroke="#6fd6ee" strokeWidth="1.2" />
        {ARC_PTS.map(([n, lo, la, c]) => { const x = Number(px(lo)), y = Number(py(la)); const d = `M${x} ${y} Q${(x + hub[0]) / 2 - 18} ${Math.min(y, hub[1]) - 30} ${hub[0]} ${hub[1]}`; return <g key={n}><path d={d} stroke={c} strokeWidth="1.6" strokeDasharray="4 5" className="ds-arc" /><circle cx={x} cy={y} r="3.2" fill={c} stroke="none"><title>{n}</title></circle></g> })}
        <circle cx={hub[0]} cy={hub[1]} r="6" fill="#35f5a1" stroke="none" className="ds-hub" /><circle cx={hub[0]} cy={hub[1]} r="12" stroke="#35f5a1" className="ds-hub-ring" />
      </g>
    </g>
  </svg>
}
function Readiness() {
  const cards = [
    ['API Health', 'All adapters operational', '5 / 5 responding · p95 420 ms', '#35f5a1', 'check'],
    ['Last Refresh', 'Today, 8:30 PM IST', '18,450 records · 4 min 12 s run', '#4d8dff', 'bolt'],
    ['Next Scheduled Refresh', 'Tomorrow, 12:00 AM IST', 'Nightly batch · BEE, OCM, GIS', '#9b8cff', 'layers'],
  ] as const
  return <div className="ds-ready">
    <div className="ds-ready-cards">
      {cards.map(([t, v, s, c, ic]) => <article key={t} className="ds-status glass" style={{ '--k': c } as Vars}><span className="ds-pulse" /><Glyph k={ic} size={20} /><p className="mono-label">{t}</p><strong>{v}</strong><small>{s}</small></article>)}
      <article className="ds-status glass" style={{ '--k': '#3fd8f5' } as Vars}><Glyph k="grid" size={20} /><p className="mono-label">Coverage</p><strong>28 States / 8 UTs ready for onboarding</strong>
        <div className="ds-cells" aria-label="36 states and union territories; Uttar Pradesh is live">{Array.from({ length: 36 }, (_, i) => <i key={i} className={i === 0 ? 'live' : ''} title={i === 0 ? 'Uttar Pradesh · prototype live' : 'Ready for onboarding'} style={{ '--i': i } as Vars} />)}</div>
        <small>Uttar Pradesh live · 35 ready for onboarding</small></article>
    </div>
    <div className="ds-globe-card glass"><Globe /><ul className="ds-globe-legend">{ARC_PTS.map(([n, , , c]) => <li key={n}><i style={{ background: c }} />{n}</li>)}<li><i style={{ background: '#35f5a1', boxShadow: '0 0 8px #35f5a1' }} />Platform hub · Uttar Pradesh</li></ul></div>
  </div>
}

/* ---------- page ---------- */
export default function DataScalability() {
  const [modal, setModal] = useState<{ type: 'config' | 'sample', id: string } | null>(null)
  const [note, setNote] = useState<string | null>(null)
  const [hotSrc, setHotSrc] = useState<string | null>(null)
  useEffect(() => { if (!note) return; const t = setTimeout(() => setNote(null), 3500); return () => clearTimeout(t) }, [note])
  const ms = modal ? SOURCES.find(s => s.id === modal.id)! : null

  const download = () => {
    const esc = (v: string) => `"${v.replace(/"/g, '""')}"`
    const csv = [['field', 'type', 'description', 'source'], ...DICTIONARY].map(r => r.map(esc).join(',')).join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = 'ev-platform-data-dictionary.csv'; a.click()
    URL.revokeObjectURL(a.href); setNote('Data dictionary downloaded (20 fields).')
  }

  return <section className="ds-page">
    <div className="ds-ambient" aria-hidden="true" />
    <header className="ds-header">
      <div>
        <p className="mono-label text-brand">Data & Scalability · Platform operations</p>
        <h1>One National Data Backbone for <span>EV Charging Intelligence</span></h1>
        <p className="ds-sub">Integrate VAHAN, BEE EV Yatra, Open Charge Map, CPO APIs, and Government GIS into a scalable planning platform.</p>
        <p className="source-badge">VAHAN · BEE EV Yatra · Open Charge Map · CPO APIs · Government GIS</p>
      </div>
      <div className="ds-header-actions">
        <span className="ds-live"><i />5 source adapters registered</span>
        <div>
          <button className="btn-primary" onClick={() => document.getElementById('ds-architecture')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>View Integration Architecture <Icon name="arrow" size={15} /></button>
          <button className="btn-ghost" onClick={download}>Download Data Dictionary</button>
        </div>
      </div>
    </header>

    <Hero ext={hotSrc} />

    <SecHead kicker="Source adapters" title="Five sources, one contract" sub="Each adapter maps a different official or open source into the same normalized record schema." />
    <div className="ds-cards">{SOURCES.map(s => <AdapterCard key={s.id} s={s} onHover={setHotSrc} onConfig={() => setModal({ type: 'config', id: s.id })} onSample={() => setModal({ type: 'sample', id: s.id })} />)}</div>

    <SecHead kicker="Integration pipeline" title="From Raw Data to Planning Intelligence" sub="Eight stages turn fragmented feeds into ranked, location-aware recommendations. Hover a stage for example checks." />
    <Pipeline />

    <SecHead kicker="Observability" title="Data Quality & Provenance" sub="Nothing is silently dropped: every issue is flagged, counted and traceable to its source." />
    <Quality />

    <SecHead kicker="Scalability roadmap" title="From Uttar Pradesh Prototype to National Platform" />
    <Roadmap />

    <SecHead id="ds-architecture" kicker="Architecture" title="Pluggable Adapter Architecture" />
    <Architecture />

    <SecHead kicker="Live operations" title="Operational Readiness" />
    <Readiness />

    {note && <div className="ds-toast" role="status"><Icon name="check" size={16} />{note}</div>}
    {modal && ms && <Modal title={ms.name} onClose={() => setModal(null)}>{modal.type === 'config' ? <ConfigForm s={ms} onClose={() => setModal(null)} onSaved={setNote} /> : <SampleTable s={ms} />}</Modal>}
  </section>
}
