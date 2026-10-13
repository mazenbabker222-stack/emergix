/**
 * Station text is stored as a tiny, safe subset of inline HTML: <b>, <i>, <br> and the entities
 * &lt; &gt; &amp;. It is parsed into nodes and rendered as React elements (never innerHTML).
 */
export type RichNode =
  | { type: 'text'; text: string }
  | { type: 'b' | 'i'; children: RichNode[] }
  | { type: 'br' };

const decode = (s: string) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');

export function parseRich(input: string): RichNode[] {
  const root: RichNode[] = [];
  const stack: { tag: 'b' | 'i'; children: RichNode[] }[] = [];
  const current = () => (stack.length ? stack[stack.length - 1]!.children : root);
  for (const part of input.split(/(<\/?(?:b|i)>|<br>)/)) {
    if (part === '') continue;
    if (part === '<br>') current().push({ type: 'br' });
    else if (part === '<b>' || part === '<i>') stack.push({ tag: part === '<b>' ? 'b' : 'i', children: [] });
    else if (part === '</b>' || part === '</i>') {
      const tag = part === '</b>' ? 'b' : 'i';
      // Close the matching tag; ignore stray closing tags.
      const idx = stack.map((s) => s.tag).lastIndexOf(tag);
      while (stack.length > idx && idx >= 0) {
        const done = stack.pop()!;
        current().push({ type: done.tag, children: done.children });
      }
    } else current().push({ type: 'text', text: decode(part) });
  }
  // Unclosed tags: close them so no content is lost.
  while (stack.length) {
    const done = stack.pop()!;
    current().push({ type: done.tag, children: done.children });
  }
  return root;
}

/** Plain text of a rich string (tags removed), for search, print titles and tests. */
export function richToPlain(input: string): string {
  const walk = (nodes: RichNode[]): string =>
    nodes.map((n) => (n.type === 'text' ? n.text : n.type === 'br' ? ' ' : walk(n.children))).join('');
  return walk(parseRich(input));
}
