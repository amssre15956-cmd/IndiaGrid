import type { AssistantEvent } from './types'

/**
 * Explicit LOCAL DEMO MODE, used only when the FastAPI/Ollama backend cannot be reached.
 * Answers come from fixed prototype content in this app (the same SAMPLE figures shown on the Decision Dashboard)
 * and are always labelled as demo/sample. No external service is called.
 */
const DISTRICTS: [string, string, number, number][] = [
  ['Lucknow', 'Critical', 82.4, 141], ['Gautam Buddha Nagar', 'Critical', 79.8, 88], ['Ghaziabad', 'High', 68.2, 24],
  ['Kanpur Nagar', 'High', 61.5, 21], ['Varanasi', 'Medium', 51.3, 17], ['Prayagraj', 'Medium', 47.9, 15],
  ['Agra', 'Medium', 44.2, 14], ['Meerut', 'Low', 36.8, 11], ['Bareilly', 'Low', 31.5, 9], ['Gorakhpur', 'Low', 27.1, 7],
]
const table = (rows: [string, string, number, number][]) =>
  '| Rank | District | Priority | Gap Score | Additional chargers |\n|---|---|---|---|---|\n' +
  rows.map((r, i) => `| ${i + 1} | ${r[0]} | ${r[1]} | ${r[2]} | ${r[3]} |`).join('\n')

export interface DemoAnswer { text: string; sources: string[]; notes: string[] }

const FORMULA = `**Gap Score** is a 0-100 score; higher means a larger mismatch between EV demand and public charging supply.

\`\`\`
Gap Score = 100 x [ 0.45 x N(EVs per charger)
                  + 0.25 x (1 - Coverage Score)
                  + 0.20 x N(Demand Context)
                  + 0.10 x N(Corridor Deficit) ]
\`\`\`

- **N(.)** normalises each term to 0-1.
- **Coverage Score** is the share of the area served by public chargers (0-1), so lower coverage raises the score.
- This is the example formula configured for the prototype. It is not verified official government methodology, and the normalisation ranges and missing-value rules are not specified in the built-in content.`

export function demoAnswer(q: string): DemoAnswer {
  const t = q.toLowerCase()
  const has = (...k: string[]) => k.some((x) => t.includes(x))
  const dist = DISTRICTS.find((d) => t.includes(d[0].toLowerCase()))

  if (has('formula', 'explain the gap', 'how is gap', 'what is gap score')) return { text: FORMULA, sources: ['APP_METHODOLOGY'], notes: [] }
  if (has('highest gap', 'top district', 'most underserved', 'worst') ) {
    const [d] = DISTRICTS
    return { text: `**${d[0]}** has the highest Gap Score (**${d[2]}**, ${d[1]}) among the 10 prototype Uttar Pradesh districts, with about ${d[3]} additional chargers required.\n\n${table(DISTRICTS.slice(0, 3))}`, sources: ['DASHBOARD_SAMPLE'], notes: ['Ranking basis: Gap Score, descending; scope: 10 sample Uttar Pradesh districts only.'] }
  }
  if (dist) return { text: `**${dist[0]}** (Uttar Pradesh): priority **${dist[1]}**, Gap Score **${dist[2]}**, about **${dist[3]}** additional chargers required.\n\nEVs, charging-point counts and coverage for this district are not part of the built-in demo content. Connect the backend for those figures.`, sources: ['DASHBOARD_SAMPLE'], notes: ['Sample prototype figures, not official statistics.'] }
  if (has('underserved', 'priority', 'rank', 'deficit', 'compare')) return { text: `Districts ranked by Gap Score in the prototype:\n\n${table(DISTRICTS)}\n\nCritical and High districts need the most additional chargers first.`, sources: ['DASHBOARD_SAMPLE'], notes: ['Sample figures for Uttar Pradesh only; EVs-per-charger values are not included in demo mode.'] }
  if (has('source', 'vahan', 'bee', 'open charge', 'cpo', 'gis', 'methodology', 'refresh', 'data does'))
    return { text: `The platform is designed around five source adapters:\n\n- **VAHAN / Parivahan**: EV registrations by fuel type, vehicle category, state/district and period (dashboard reports, configurable API or CSV).\n- **BEE EV Yatra**: public charging stations, operators, coordinates, charging points and connectors.\n- **Open Charge Map**: open registry of charging locations (REST API, key required).\n- **CPO APIs**: operator locations, EVSEs, connectors and availability (OCPI-style or custom REST).\n- **Government GIS**: state/district boundaries and highway geometry (GeoJSON / GIS feed).\n\nIn this prototype these run on **sample or fallback data**. Exact refresh schedules are set per adapter on the Data & Scalability tab; no live VAHAN refresh is confirmed here.`, sources: ['APP_DOCUMENTATION'], notes: ['Describes the designed adapters, not live connections.'] }
  if (has('adapter', 'new cpo', 'scale', 'nationally', 'national')) return { text: `To add a source or scale nationally:\n\n1. Implement a class with \`fetch()\` returning normalised records and register it in the adapter registry.\n2. Map its fields to the normalised station schema.\n3. Extend the district boundary layer and schedule refreshes per source.\n4. Add monitoring for freshness and validation failures.\n\nThe core pipeline and dashboard stay unchanged.`, sources: ['APP_DOCUMENTATION'], notes: [] }
  if (has('sample data', 'synthetic')) return { text: 'In this prototype, BEE EV Yatra runs on a sample extract, CPO APIs use fallback samples until credentials are configured, and the dashboard district figures are sample data. None of it is official statistics.', sources: ['APP_DOCUMENTATION'], notes: [] }
  if (has('2029', 'forecast', 'estimate', 'demand', 'chargers needed', 'highway', 'corridor', 'uncovered', 'nh-'))
    return { text: 'A reliable estimate for this needs the real EV population, planning horizon, target EVs-per-charger ratio and existing functional charging points, or highway route geometry. Those inputs are **unavailable in demo mode**. Start the local backend and connect the platform data, or use the Charger Estimator tab, which shows its own assumptions.', sources: [], notes: [] }
  return { text: 'I can\'t answer that from the built-in demo content. In demo mode I can explain the Gap Score formula, list the data sources, rank the sample Uttar Pradesh districts and describe how to add adapters. Start the local backend for full answers.', sources: [], notes: [] }
}

export async function* demoStream(q: string): AsyncGenerator<AssistantEvent> {
  const a = demoAnswer(q)
  for (const part of a.text.match(/\S+\s*|\n+/g) ?? []) {
    await new Promise((r) => setTimeout(r, 14))
    yield { event: 'token', text: part }
  }
  yield { event: 'source', sources: ['LOCAL_DEMO_MODE', ...a.sources], data_quality: a.sources.length ? 'SAMPLE' : 'UNAVAILABLE', notes: ['Local demo mode: the backend is offline, so this answer comes from fixed prototype content, not the local Llama model.', ...a.notes] }
  yield { event: 'audio_unavailable', reason: 'backend offline (no local TTS)' }
  yield { event: 'done' }
}
