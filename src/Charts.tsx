import { useEffect, useState } from 'react'

export function useMounted(delay = 150) {
  const [m, setM] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setM(true), delay)
    return () => clearTimeout(t)
  }, [delay])
  return m
}

export function CountUp({ to, decimals = 0, suffix = '', prefix = '' }: { to: number; decimals?: number; suffix?: string; prefix?: string }) {
  const [v, setV] = useState(0)
  useEffect(() => {
    let raf = 0
    const t0 = performance.now()
    const tick = (t: number) => {
      const p = Math.min((t - t0) / 1600, 1)
      setV(to * (1 - Math.pow(1 - p, 3)))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [to])
  return <>{prefix}{v.toLocaleString('en-IN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}{suffix}</>
}

export function Bars({ data, mini = false }: { data: [string, number][]; mini?: boolean }) {
  const m = useMounted()
  const max = Math.max(...data.map((d) => d[1]))
  return (
    <div className={`flex items-end gap-2 ${mini ? 'h-20' : 'h-44'}`} role="img" aria-label="Bar chart of fast-charger coverage by state">
      {data.map(([k, v], i) => (
        <div key={k} className="group relative flex h-full flex-1 flex-col items-center justify-end gap-1.5">
          <span className="pointer-events-none absolute -top-1 rounded bg-[var(--surface-strong)] px-1.5 py-0.5 font-mono text-[10px] text-ink opacity-0 transition group-hover:-translate-y-1 group-hover:opacity-100">{v}%</span>
          <div
            className="w-full rounded-t-md transition-all duration-[1100ms] ease-out group-hover:brightness-125 group-hover:shadow-[0_0_18px_var(--glow)]"
            style={{
              height: m ? `${(v / max) * 82}%` : '0%',
              transitionDelay: `${i * 70}ms`,
              background: v < 30 ? 'linear-gradient(var(--violet), color-mix(in srgb, var(--violet) 30%, transparent))' : 'linear-gradient(var(--green), color-mix(in srgb, var(--cyan) 35%, transparent))',
            }}
          />
          <span className={`font-mono text-soft ${mini ? 'text-[9px]' : 'text-[10px]'}`}>{k}</span>
        </div>
      ))}
    </div>
  )
}

export function Donut({ parts }: { parts: { label: string; v: number; color: string }[] }) {
  const m = useMounted()
  const [hot, setHot] = useState<number | null>(null)
  const R = 52
  const C = 2 * Math.PI * R
  let off = 0
  return (
    <div className="flex items-center gap-6">
      <div className="relative h-36 w-36 shrink-0">
        <svg viewBox="0 0 140 140" className="-rotate-90" role="img" aria-label="Donut chart of charger status">
          <circle cx="70" cy="70" r={R} fill="none" stroke="var(--line)" strokeWidth="14" />
          {parts.map((p, i) => {
            const len = (p.v / 100) * C
            const el = (
              <circle
                key={p.label}
                cx="70" cy="70" r={R} fill="none" stroke={p.color} strokeWidth={hot === i ? 18 : 14}
                strokeDasharray={`${m ? len - 3 : 0} ${C}`} strokeDashoffset={-off}
                style={{ transition: 'all 1.2s ease-out, stroke-width .2s', filter: hot === i ? `drop-shadow(0 0 6px ${p.color})` : undefined }}
                onMouseEnter={() => setHot(i)} onMouseLeave={() => setHot(null)}
              />
            )
            off += len
            return el
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display text-2xl font-bold">{hot === null ? '78%' : parts[hot].v + '%'}</span>
          <span className="text-[10px] text-soft">{hot === null ? 'Operational' : parts[hot].label}</span>
        </div>
      </div>
      <ul className="space-y-2 text-sm">
        {parts.map((p, i) => (
          <li key={p.label} className="flex items-center gap-2 text-soft hover:text-ink" onMouseEnter={() => setHot(i)} onMouseLeave={() => setHot(null)}>
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: p.color }} />{p.label}
          </li>
        ))}
      </ul>
    </div>
  )
}

export function Line({ data }: { data: number[] }) {
  const m = useMounted()
  const [i, setI] = useState<number | null>(null)
  const W = 400, H = 160
  const max = Math.max(...data) * 1.1
  const pts = data.map((v, k) => [(k / (data.length - 1)) * W, H - (v / max) * H] as const)
  const d = pts.map(([x, y], k) => `${k ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join('')
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return (
    <div className="relative">
      <svg viewBox={`-8 -12 ${W + 16} ${H + 40}`} className="w-full overflow-visible" role="img" aria-label="Line chart of monthly charger installations">
        <defs>
          <linearGradient id="areaG" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--cyan)" stopOpacity="0.35" />
            <stop offset="1" stopColor="var(--cyan)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0, 1, 2, 3].map((g) => <line key={g} x1="0" x2={W} y1={(g / 3) * H} y2={(g / 3) * H} stroke="var(--line)" strokeDasharray="3 5" />)}
        <path d={`${d}L${W},${H}L0,${H}Z`} fill="url(#areaG)" style={{ opacity: m ? 1 : 0, transition: 'opacity 1.4s .5s' }} />
        <path d={d} fill="none" stroke="var(--cyan)" strokeWidth="2.5" strokeLinecap="round" pathLength={1} strokeDasharray="1" strokeDashoffset={m ? 0 : 1} style={{ transition: 'stroke-dashoffset 2s ease-out', filter: 'drop-shadow(0 0 6px var(--cyan))' }} />
        {pts.map(([x, y], k) => (
          <g key={k} onMouseEnter={() => setI(k)} onMouseLeave={() => setI(null)}>
            <rect x={x - 16} y="-12" width="32" height={H + 40} fill="transparent" />
            <circle cx={x} cy={y} r={i === k ? 6 : 3.5} fill="var(--bg)" stroke="var(--green)" strokeWidth="2" style={{ transition: 'r .2s' }} />
            <text x={x} y={H + 20} textAnchor="middle" fontSize="10" fill="var(--text-soft)" fontFamily="var(--font-mono)">{months[k]}</text>
          </g>
        ))}
        {i !== null && (
          <g>
            <rect x={pts[i][0] - 34} y={pts[i][1] - 36} width="68" height="24" rx="8" fill="var(--surface-strong)" stroke="var(--green)" />
            <text x={pts[i][0]} y={pts[i][1] - 20} textAnchor="middle" fontSize="11" fill="var(--text)" fontFamily="var(--font-mono)">{data[i].toLocaleString('en-IN')}</text>
          </g>
        )}
      </svg>
    </div>
  )
}

export function Heatmap() {
  const rows = ['North', 'West', 'South', 'East', 'North-East', 'Central']
  const base = [0.7, 0.8, 0.85, 0.5, 0.25, 0.4]
  const cols = 14
  const [tip, setTip] = useState('Hover a cell for details')
  return (
    <div>
      <div className="space-y-1.5" role="img" aria-label="Heatmap of charger availability by region and time">
        {rows.map((r, ri) => (
          <div key={r} className="flex items-center gap-1.5">
            <span className="w-16 shrink-0 font-mono text-[10px] text-soft">{r}</span>
            {Array.from({ length: cols }).map((_, c) => {
              const v = Math.max(0.05, Math.min(1, base[ri] + Math.sin(c * 0.9 + ri * 1.7) * 0.22 + ((c * 7 + ri * 13) % 5) * 0.025))
              const pct = Math.round(v * 100)
              return (
                <button
                  key={c}
                  tabIndex={-1}
                  onMouseEnter={() => setTip(`${r} • ${String(c * 90 / 60 | 0).padStart(2, '0')}:00 window • ${pct}% availability`)}
                  className="h-6 flex-1 rounded-[5px] transition hover:scale-125 hover:ring-1 hover:ring-white/70"
                  style={{ background: `color-mix(in srgb, var(--green) ${pct}%, color-mix(in srgb, var(--violet) 55%, transparent))`, opacity: 0.35 + v * 0.65 }}
                  aria-label={`${r} ${pct}%`}
                />
              )
            })}
          </div>
        ))}
      </div>
      <p className="mt-3 font-mono text-[11px] text-soft" aria-live="polite">{tip}</p>
    </div>
  )
}
