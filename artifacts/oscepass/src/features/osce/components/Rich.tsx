import { Fragment, type ReactNode } from 'react';
import type { OsceBlock } from '@workspace/api-client-react';
import { parseRich, type RichNode } from '../lib/rich';

function renderNodes(nodes: RichNode[]): ReactNode {
  return nodes.map((n, i) => {
    if (n.type === 'text') return <Fragment key={i}>{n.text}</Fragment>;
    if (n.type === 'br') return <br key={i} />;
    return n.type === 'b' ? <strong key={i}>{renderNodes(n.children)}</strong> : <em key={i}>{renderNodes(n.children)}</em>;
  });
}

/** Renders station text (b, i, br only) as React elements. */
export function Rich({ text }: { text: string }) {
  return <>{renderNodes(parseRich(text))}</>;
}

/** Renders a list of content blocks (paragraphs, lists, tables, callouts). */
export function Blocks({ blocks }: { blocks: OsceBlock[] }) {
  return (
    <>
      {blocks.map((b, i) => {
        switch (b.t) {
          case 'p':
            return <p key={i} className={b.muted ? 'osce-muted' : undefined}><Rich text={b.text ?? ''} /></p>;
          case 'callout':
            return <p key={i} className="osce-callout" role="note"><Rich text={b.text ?? ''} /></p>;
          case 'h3':
            return <h3 key={i}><Rich text={b.text ?? ''} /></h3>;
          case 'ul':
            return <ul key={i}>{(b.items ?? []).map((it, j) => <li key={j}><Rich text={it} /></li>)}</ul>;
          case 'ol':
            return <ol key={i}>{(b.items ?? []).map((it, j) => <li key={j}><Rich text={it} /></li>)}</ol>;
          case 'table':
            return (
              <div key={i} className="osce-scroll" tabIndex={0} role="region" aria-label="Table, scrolls sideways on small screens">
                <table className="osce-table">
                  {b.head && b.head.length > 0 && <thead><tr>{b.head.map((h, j) => <th key={j} scope="col"><Rich text={h} /></th>)}</tr></thead>}
                  <tbody>{(b.rows ?? []).map((row, r) => <tr key={r}>{row.map((c, j) => (j === 0 ? <th key={j} scope="row"><Rich text={c} /></th> : <td key={j}><Rich text={c} /></td>))}</tr>)}</tbody>
                </table>
              </div>
            );
          default:
            return null;
        }
      })}
    </>
  );
}
