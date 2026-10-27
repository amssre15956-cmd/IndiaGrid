const D: Record<string, string> = {
  mic: 'M12 3a3 3 0 00-3 3v6a3 3 0 006 0V6a3 3 0 00-3-3zM6 11a6 6 0 0012 0M12 17v4',
  plus: 'M12 5v14M5 12h14',
  stop: 'M7 7h10v10H7z',
  power: 'M12 3v9M6.3 6.8a8 8 0 1011.4 0',
  copy: 'M9 9h10v11H9zM5 15V4h10',
  play: 'M8 5l11 7-11 7z',
  pause: 'M8 5v14M16 5v14',
  download: 'M12 4v11M7 11l5 5 5-5M5 20h14',
  retry: 'M4 12a8 8 0 018-8 8 8 0 016 3M20 4v4h-4M20 12a8 8 0 01-14 5M4 20v-4h4',
  minus: 'M5 12h14',
  chat: 'M4 5h16v11H9l-5 4z',
  file: 'M6 3h9l4 4v14H6zM14 3v5h5',
  x: 'M6 6l12 12M18 6L6 18',
  send: 'M22 2L11 13M22 2l-7 20-4-9-9-4z',
  vol: 'M11 5L6 9H3v6h3l5 4zM15.5 8.5a5 5 0 010 7',
}
export function I({ n, s = 18 }: { n: keyof typeof D; s?: number }) {
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={D[n]} /></svg>
}
