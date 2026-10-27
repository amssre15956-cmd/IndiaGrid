import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { STATE_SHAPES } from './stateShapes'
import { Icon } from './icons'

export type CoinCity = { name: string; state: string; chargers: number; status: string; util: number; gap: number }

const LAYERS = 9

export default function StateCoin({ city, onClose }: { city: CoinCity; onClose: () => void }) {
  const pts = STATE_SHAPES[city.state]

  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', k)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', k)
      document.body.style.overflow = ''
    }
  }, [onClose])

  return createPortal(
    <div className="coin-backdrop fixed inset-0 z-[80] grid place-items-center overflow-y-auto p-4" onClick={onClose} role="dialog" aria-modal="true" aria-label={`${city.state} hologram`}>
      <div className="flex w-full max-w-[980px] flex-col items-center gap-8 py-8 lg:flex-row lg:justify-center" onClick={(e) => e.stopPropagation()}>
        <div className="coin-stage">
          <div className="coin">
            {/* back face: emblem seen mid-flip */}
            <div className="coin-face coin-back">
              <div className="coin-rim" />
              <div className="coin-inner grid place-items-center">
                <Icon name="bolt" size={96} className="text-brand" />
              </div>
            </div>

            {/* front face: hologram */}
            <div className="coin-face coin-front">
              <div className="coin-rim" />
              <svg className="absolute inset-0 h-full w-full" viewBox="0 0 400 400" aria-hidden="true">
                <defs><path id="rimPath" d="M200,200 m-181,0 a181,181 0 1,1 362,0 a181,181 0 1,1 -362,0" /></defs>
                <text fontSize="13" letterSpacing="5" fill="rgba(0,0,0,.55)" fontFamily="var(--font-mono)" fontWeight="600">
                  <textPath href="#rimPath">NATIONAL EV CHARGER INTELLIGENCE ✦ BHARAT ✦ {city.state.toUpperCase()} ✦ NATIONAL EV CHARGER INTELLIGENCE ✦</textPath>
                </text>
              </svg>
              <div className="coin-inner">
                <div className="holo-scene">
                  <div className="holo-ground" />
                  <div className="holo-spin">
                    {Array.from({ length: LAYERS }).map((_, i) => (
                      <svg key={i} viewBox="0 0 100 100" className="absolute inset-0 h-full w-full overflow-visible" style={{ transform: `translateZ(${i * 2.4}px)` }}>
                        <polygon points={pts} fill={i < LAYERS - 1 ? 'color-mix(in srgb, var(--map-b) 28%, transparent)' : 'url(#holoFill)'} stroke={i < LAYERS - 1 ? 'color-mix(in srgb, var(--cyan) 55%, transparent)' : 'none'} strokeWidth="0.4" vectorEffect="non-scaling-stroke" />
                        {i === LAYERS - 1 && (
                          <>
                            <defs>
                              <linearGradient id="holoFill" x1="0" y1="0" x2="1" y2="1">
                                <stop offset="0" stopColor="var(--map-a)" stopOpacity="0.75" />
                                <stop offset="0.5" stopColor="var(--map-b)" stopOpacity="0.6" />
                                <stop offset="1" stopColor="var(--map-d)" stopOpacity="0.7" />
                              </linearGradient>
                              <filter id="aura" x="-20%" y="-20%" width="140%" height="140%">
                                <feGaussianBlur stdDeviation="1.4" result="b" />
                                <feMerge><feMergeNode in="b" /><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
                              </filter>
                            </defs>
                            <polygon points={pts} fill="none" stroke="var(--cyan)" strokeWidth="1" strokeOpacity="0.9" vectorEffect="non-scaling-stroke" />
                            <polygon className="aura" points={pts} pathLength={100} fill="none" stroke="#fff" strokeWidth="1" strokeLinecap="round" filter="url(#aura)" />
                            <polygon className="aura aura-2" points={pts} pathLength={100} fill="none" stroke="var(--green)" strokeWidth="0.7" strokeLinecap="round" filter="url(#aura)" />
                          </>
                        )}
                      </svg>
                    ))}
                  </div>
                </div>
                <div className="holo-scan" />
              </div>
            </div>
          </div>
        </div>

        <aside className="coin-info glass relative w-full max-w-sm rounded-3xl p-6" style={{ background: 'var(--surface-strong)' }}>
          <div className="flex items-start justify-between gap-4">
            <div className="pr-12">
              <p className="mono-label text-brand">State hologram</p>
              <h2 className="mt-1 text-3xl font-bold">{city.state}</h2>
              <p className="text-sm text-soft">Selected hub · {city.name}</p>
            </div>
            <button type="button" onClick={onClose} aria-label="Close state card" title="Close (Esc)" className="coin-close"><Icon name="close" size={20} /></button>
          </div>
          <dl className="mt-6 grid grid-cols-2 gap-3">
            {[
              ['Chargers', city.chargers.toLocaleString('en-IN')],
              ['Availability', city.status],
              ['Utilization', city.util + '%'],
              ['Coverage gap', city.gap + '%'],
            ].map(([k, v]) => (
              <div key={k} className="rounded-2xl border border-line p-4 transition hover:-translate-y-1 hover:border-brand" style={{ background: 'var(--surface)' }}>
                <dt className="mono-label !text-[10px]">{k}</dt>
                <dd className="mt-1 font-display text-xl font-bold">{v}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-5 text-xs leading-relaxed text-soft">Placeholder metrics. Aura light traces the state boundary on the hologram.</p>
        </aside>
      </div>
    </div>,
    document.body,
  )
}
