import { TRILOGY_DOCUMENTS } from '../game/trilogy-documents'

export function TrilogyDocument({ id }: { id: string }) {
  const document = TRILOGY_DOCUMENTS[id]
  if (!document) return null
  return <section className={`trilogy-document trilogy-document-${document.kind}`} aria-label={document.title}>
    <span>{document.icon}</span><h3>{document.title}</h3>{document.lines.map(line => <p key={line}>{line}</p>)}
    {document.kind === 'paper' && <div aria-hidden className="trilogy-document-stamp">留存</div>}
  </section>
}
