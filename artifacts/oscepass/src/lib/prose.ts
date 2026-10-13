/**
 * Tiny, safe markdown subset used by admin-edited content (exam text, FAQ answers, legal pages, blog).
 * Supports: ## / ### headings, "- " bullet lists, paragraphs, **bold**, *italic*, [text](url).
 * Output is a plain data structure rendered with React elements (never dangerouslySetInnerHTML).
 */
export type Inline =
  | { type: 'text'; text: string }
  | { type: 'bold'; children: Inline[] }
  | { type: 'em'; children: Inline[] }
  | { type: 'link'; href: string; children: Inline[] };

export type Block =
  | { type: 'h2' | 'h3'; text: string }
  | { type: 'p'; inline: Inline[] }
  | { type: 'ul'; items: Inline[][] };

/** Only http(s), mailto and site-relative links are allowed; anything else (javascript:, data:) is dropped. */
export function safeHref(url: string): string | null {
  const value = url.trim();
  if (/^https?:\/\//i.test(value) || /^mailto:/i.test(value)) return value;
  if (value.startsWith('/') && !value.startsWith('//')) return value;
  return null;
}

const TOKEN = /\*\*(.+?)\*\*|\*(.+?)\*|\[([^\]]+)\]\(([^)\s]+)\)/g;

export function parseInline(src: string): Inline[] {
  const out: Inline[] = [];
  let last = 0;
  for (const match of src.matchAll(TOKEN)) {
    const index = match.index ?? 0;
    if (index > last) out.push({ type: 'text', text: src.slice(last, index) });
    if (match[1] !== undefined) out.push({ type: 'bold', children: parseInline(match[1]) });
    else if (match[2] !== undefined) out.push({ type: 'em', children: parseInline(match[2]) });
    else {
      const href = safeHref(match[4] ?? '');
      out.push(href ? { type: 'link', href, children: parseInline(match[3] ?? '') } : { type: 'text', text: match[3] ?? '' });
    }
    last = index + match[0].length;
  }
  if (last < src.length) out.push({ type: 'text', text: src.slice(last) });
  return out;
}

export function parseBlocks(src: string): Block[] {
  const blocks: Block[] = [];
  let paragraph: string[] = [];
  let list: Inline[][] | null = null;
  const flush = () => {
    if (paragraph.length) blocks.push({ type: 'p', inline: parseInline(paragraph.join(' ')) });
    if (list) blocks.push({ type: 'ul', items: list });
    paragraph = [];
    list = null;
  };
  for (const raw of src.replace(/\r\n?/g, '\n').split('\n')) {
    const line = raw.trim();
    if (!line) {
      flush();
    } else if (line.startsWith('### ')) {
      flush();
      blocks.push({ type: 'h3', text: line.slice(4).trim() });
    } else if (line.startsWith('## ')) {
      flush();
      blocks.push({ type: 'h2', text: line.slice(3).trim() });
    } else if (line.startsWith('- ')) {
      if (paragraph.length) flush();
      (list ??= []).push(parseInline(line.slice(2).trim()));
    } else {
      if (list) flush();
      paragraph.push(line);
    }
  }
  flush();
  return blocks;
}

/** Plain text (no markup) for JSON-LD and meta descriptions. */
export function stripMarkdown(src: string): string {
  return src
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/^#{2,3}\s+/gm, '')
    .replace(/^-\s+/gm, '')
    .replace(/\s+/g, ' ')
    .trim();
}
