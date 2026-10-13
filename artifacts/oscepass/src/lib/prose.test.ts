import { describe, expect, it } from 'vitest';
import { parseBlocks, parseInline, safeHref, stripMarkdown } from './prose';

describe('safeHref', () => {
  it('allows http(s), mailto and site-relative links only', () => {
    expect(safeHref('https://rcem.ac.uk/')).toBe('https://rcem.ac.uk/');
    expect(safeHref('mailto:a@b.co')).toBe('mailto:a@b.co');
    expect(safeHref('/calendar')).toBe('/calendar');
    expect(safeHref('javascript:alert(1)')).toBeNull();
    expect(safeHref('//evil.example')).toBeNull();
    expect(safeHref('data:text/html,x')).toBeNull();
  });
});

describe('parseInline', () => {
  it('parses bold, italic and links, and drops unsafe links to plain text', () => {
    const nodes = parseInline('a **b** *c* [d](/e) [x](javascript:void)');
    expect(nodes.map((n) => n.type)).toEqual(['text', 'bold', 'text', 'em', 'text', 'link', 'text', 'text']);
  });
});

describe('parseBlocks', () => {
  it('builds headings, paragraphs and lists', () => {
    const blocks = parseBlocks('## Title\n\nOne\ntwo\n\n- a\n- b\n\n### Sub');
    expect(blocks.map((b) => b.type)).toEqual(['h2', 'p', 'ul', 'h3']);
    const list = blocks[2];
    expect(list?.type === 'ul' && list.items.length).toBe(2);
  });
  it('never emits raw HTML: tags stay as text', () => {
    const [p] = parseBlocks('<script>alert(1)</script>');
    expect(p).toEqual({ type: 'p', inline: [{ type: 'text', text: '<script>alert(1)</script>' }] });
  });
});

describe('stripMarkdown', () => {
  it('removes markup for JSON-LD', () => {
    expect(stripMarkdown('See **this** [link](/x).\n\n- item')).toBe('See this link. item');
  });
});
