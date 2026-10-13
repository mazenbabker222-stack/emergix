import { Fragment } from 'react';
import { Link } from 'wouter';
import { parseBlocks, type Inline } from '@/lib/prose';

function renderInline(nodes: Inline[]) {
  return nodes.map((node, i) => {
    switch (node.type) {
      case 'text':
        return <Fragment key={i}>{node.text}</Fragment>;
      case 'bold':
        return <strong key={i}>{renderInline(node.children)}</strong>;
      case 'em':
        return <em key={i}>{renderInline(node.children)}</em>;
      case 'link':
        return node.href.startsWith('/') ? (
          <Link key={i} href={node.href}>{renderInline(node.children)}</Link>
        ) : (
          <a key={i} href={node.href} target="_blank" rel="noopener noreferrer">
            {renderInline(node.children)}
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
        );
    }
  });
}

/** Renders admin-edited mini-markdown (see lib/prose.ts) with React elements only. */
export function Prose({ text, className = '' }: { text: string; className?: string }) {
  return (
    <div className={`prose-lite ${className}`.trim()}>
      {parseBlocks(text).map((block, i) => {
        switch (block.type) {
          case 'h2':
            return <h2 key={i}>{block.text}</h2>;
          case 'h3':
            return <h3 key={i}>{block.text}</h3>;
          case 'p':
            return <p key={i}>{renderInline(block.inline)}</p>;
          case 'ul':
            return <ul key={i}>{block.items.map((item, j) => <li key={j}>{renderInline(item)}</li>)}</ul>;
        }
      })}
    </div>
  );
}
