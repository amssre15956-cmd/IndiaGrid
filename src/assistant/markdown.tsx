import type { ReactNode } from 'react'

/** Minimal, HTML-free Markdown renderer: model output is never injected as HTML. */
function inline(s: string): ReactNode[] {
  const out: ReactNode[] = []
  const re = /(\*\*[^*]+\*\*|`[^`]+`)/g
  let last = 0, m: RegExpExecArray | null, k = 0
  while ((m = re.exec(s))) {
    if (m.index > last) out.push(s.slice(last, m.index))
    const t = m[0]
    out.push(t.startsWith('**') ? <strong key={k++}>{t.slice(2, -2)}</strong> : <code key={k++}>{t.slice(1, -1)}</code>)
    last = m.index + t.length
  }
  out.push(s.slice(last))
  return out
}
const cells = (l: string) => l.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim())

export function Markdown({ text }: { text: string }) {
  const lines = text.split('\n')
  const nodes: ReactNode[] = []
  let i = 0, k = 0
  while (i < lines.length) {
    const l = lines[i]
    if (l.startsWith('```')) {
      const buf: string[] = []
      i++
      while (i < lines.length && !lines[i].startsWith('```')) buf.push(lines[i++])
      i++
      nodes.push(<pre key={k++}><code>{buf.join('\n')}</code></pre>)
    } else if (/^\s*\|.*\|\s*$/.test(l) && i + 1 < lines.length && /^\s*\|?[\s:-]+\|[\s|:-]*$/.test(lines[i + 1])) {
      const head = cells(l)
      i += 2
      const rows: string[][] = []
      while (i < lines.length && /^\s*\|.*\|\s*$/.test(lines[i])) rows.push(cells(lines[i++]))
      nodes.push(<div className="evx-table" key={k++}><table><thead><tr>{head.map((h, j) => <th key={j}>{inline(h)}</th>)}</tr></thead><tbody>{rows.map((r, a) => <tr key={a}>{r.map((c, b) => <td key={b}>{inline(c)}</td>)}</tr>)}</tbody></table></div>)
    } else if (/^#{1,4}\s/.test(l)) {
      nodes.push(<h4 key={k++}>{inline(l.replace(/^#+\s/, ''))}</h4>); i++
    } else if (/^\s*([-*]|\d+\.)\s/.test(l)) {
      const ord = /^\s*\d+\./.test(l)
      const items: string[] = []
      while (i < lines.length && /^\s*([-*]|\d+\.)\s/.test(lines[i])) items.push(lines[i++].replace(/^\s*([-*]|\d+\.)\s/, ''))
      const li = items.map((t, j) => <li key={j}>{inline(t)}</li>)
      nodes.push(ord ? <ol key={k++}>{li}</ol> : <ul key={k++}>{li}</ul>)
    } else if (l.trim() === '') i++
    else {
      const buf: string[] = []
      while (i < lines.length && lines[i].trim() !== '' && !/^(```|#{1,4}\s|\s*([-*]|\d+\.)\s|\s*\|)/.test(lines[i])) buf.push(lines[i++])
      if (!buf.length) { buf.push(lines[i++]) }
      nodes.push(<p key={k++}>{inline(buf.join(' '))}</p>)
    }
  }
  return <div className="evx-md">{nodes}</div>
}
