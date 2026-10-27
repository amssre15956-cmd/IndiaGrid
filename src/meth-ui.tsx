import { useEffect, useMemo, useRef, useState } from 'react'

export const fmt = (n: number, d = 0) => n.toLocaleString('en-IN', { maximumFractionDigits: d, minimumFractionDigits: d })

export const PRIORITIES = [
  { min: 75, max: 100, label: 'Critical', color: '#ff5d73', action: 'Immediate charger expansion and a detailed location study.' },
  { min: 55, max: 74, label: 'High', color: '#ff9a3c', action: 'Include in the near-term expansion plan.' },
  { min: 35, max: 54, label: 'Medium', color: '#f5d04a', action: 'Monitor and plan medium-term expansion.' },
  { min: 0, max: 34, label: 'Low', color: 'var(--green)', action: 'Maintain coverage and reassess after EV growth.' },
]
export const priorityOf = (s: number) => PRIORITIES.find((p) => s >= p.min)!

export function Card({ title, children, className = '' }: { title?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`glass rounded-2xl p-5 md:p-6 ${className}`}>
      {title && <h3 className="mb-3 font-display text-base font-semibold">{title}</h3>}
      {children}
    </div>
  )
}

export function Chip({ children, color }: { children: React.ReactNode; color?: string }) {
  return (
    <span className="rounded-full border px-2.5 py-1 font-mono text-[11px]" style={{ borderColor: color ?? 'var(--line)', color: color ?? 'var(--text-soft)', background: 'var(--surface)' }}>
      {children}
    </span>
  )
}

export function Formula({ children, caption }: { children: React.ReactNode; caption?: string }) {
  return (
    <figure className="rounded-2xl border border-line p-4 md:p-5" style={{ background: 'linear-gradient(135deg, color-mix(in srgb,var(--green) 8%, transparent), color-mix(in srgb,var(--violet) 8%, transparent))' }}>
      <div className="overflow-x-auto whitespace-pre font-mono text-sm leading-loose text-ink md:text-[15px]">{children}</div>
      {caption && <figcaption className="mt-2 text-xs text-soft">{caption}</figcaption>}
    </figure>
  )
}

export function Slider({ label, value, min, max, step = 1, unit = '', onChange, hint }: { label: string; value: number; min: number; max: number; step?: number; unit?: string; onChange: (v: number) => void; hint?: string }) {
  const id = useMemo(() => 'sl-' + label.replace(/\W+/g, '-').toLowerCase(), [label])
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={id} className="text-sm font-medium">{label}</label>
        <output htmlFor={id} className="font-mono text-sm text-brand">{fmt(value, step < 1 ? 2 : 0)}{unit}</output>
      </div>
      <input id={id} type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(+e.target.value)} className="mt-2 h-2 w-full cursor-pointer accent-[var(--green)]" />
      {hint && <p className="mt-1 text-[11px] text-soft">{hint}</p>}
    </div>
  )
}

export function Stat({ k, v, sub }: { k: string; v: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-line p-3" style={{ background: 'var(--surface)' }}>
      <p className="mono-label">{k}</p>
      <p className="mt-1 font-display text-xl font-bold md:text-2xl">{v}</p>
      {sub && <p className="text-[11px] text-soft">{sub}</p>}
    </div>
  )
}


/* ───────────── shared hooks + 3D glyph tile for the refined sections ───────────── */

export const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

export function useInView<T extends Element>(threshold = 0.25): [React.RefObject<T | null>, boolean] {
  const ref = useRef<T>(null)
  const [seen, setSeen] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const o = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setSeen(true); o.disconnect() } }, { threshold })
    o.observe(el)
    return () => o.disconnect()
  }, [threshold])
  return [ref, seen]
}

export function useTween<T extends Record<string, number>>(target: T, k = 0.16): T {
  const [v, setV] = useState<T>(target)
  const cur = useRef<T>(target)
  const key = JSON.stringify(target)
  useEffect(() => {
    if (reducedMotion()) { cur.current = target; setV(target); return }
    let raf = 0
    const step = () => {
      const next = {} as Record<string, number>
      let done = true
      for (const p in target) {
        const d = target[p] - cur.current[p]
        if (Math.abs(d) > Math.abs(target[p]) * 0.002 + 1e-4) { done = false; next[p] = cur.current[p] + d * k } else next[p] = target[p]
      }
      cur.current = next as T
      setV(next as T)
      if (!done) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, k])
  return v
}

const GLYPH: Record<string, string> = {
  db: 'M4 6c0-1.7 3.6-3 8-3s8 1.3 8 3-3.6 3-8 3-8-1.3-8-3zM4 6v6c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6',
  schema: 'M5 4h14v16H5zM9 9l1.5 1.5L13.5 8M9 15h6',
  std: 'M4 7h10M18 7h2M4 17h2M10 17h10M14 4v6M8 14v6',
  cross: 'M12 3v4M12 17v4M3 12h4M17 12h4M12 8a4 4 0 100 8 4 4 0 000-8z',
  pin: 'M12 21s7-6.2 7-11a7 7 0 10-14 0c0 4.8 7 11 7 11zM12 7.5a2.5 2.5 0 100 5 2.5 2.5 0 000-5z',
  dupe: 'M8 8h11v11H8zM5 16V5h11',
  flag: 'M6 21V4M6 5h11l-2 4 2 4H6',
  layers: 'M12 3l9 5-9 5-9-5zM3 12.5l9 5 9-5M3 17l9 5 9-5',
  bolt: 'M13 2L4 14h7l-1 8 9-12h-7z',
  globe: 'M12 3a9 9 0 100 18 9 9 0 000-18zM3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18',
  route: 'M6 20a2 2 0 100-4 2 2 0 000 4zM18 8a2 2 0 100-4 2 2 0 000 4zM8 17c9 0 1-10 8-10',
  poly: 'M4 8l5-4 7 2 4 6-3 7-8 1-5-5z',
  join: 'M9 6a6 6 0 100 12 6 6 0 000-12zM15 6a6 6 0 100 12 6 6 0 000-12z',
  chart: 'M4 20V10M10 20V4M16 20v-8M22 20H2',
  rec: 'M12 3a6 6 0 00-4 10.5V17h8v-3.5A6 6 0 0012 3zM9 20h6',
  target: 'M12 3a9 9 0 100 18 9 9 0 000-18zM12 8a4 4 0 100 8 4 4 0 000-8z',
  shield: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z',
  check: 'M5 12l5 5 9-10',
  warn: 'M12 4l9 16H3zM12 10v4M12 17v.5',
  x: 'M6 6l12 12M18 6L6 18',
  gauge: 'M4 18a8 8 0 1116 0M12 18l4-6',
  road: 'M8 3L5 21M16 3l3 18M12 4v3M12 11v3M12 18v3',
}

export function Glyph({ n, size = 20 }: { n: string; size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={GLYPH[n]} /></svg>
  )
}

export function Tile3D({ n, color, size = 46 }: { n: string; color: string; size?: number }) {
  return (
    <span className="mr-tile" style={{ ['--k' as string]: color, ['--sz' as string]: `${size}px` }} aria-hidden="true">
      <i />
      <span className="mr-tile-face"><Glyph n={n} size={Math.round(size * 0.46)} /></span>
    </span>
  )
}
