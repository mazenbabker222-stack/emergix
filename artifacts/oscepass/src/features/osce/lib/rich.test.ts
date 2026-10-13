import { describe, expect, it } from 'vitest';
import { parseRich, richToPlain } from './rich';

describe('parseRich', () => {
  it('parses bold, italic and line breaks', () => {
    expect(parseRich('a <b>b</b> <i>c</i><br>d')).toEqual([
      { type: 'text', text: 'a ' },
      { type: 'b', children: [{ type: 'text', text: 'b' }] },
      { type: 'text', text: ' ' },
      { type: 'i', children: [{ type: 'text', text: 'c' }] },
      { type: 'br' },
      { type: 'text', text: 'd' },
    ]);
  });

  it('decodes entities and never treats other markup as HTML', () => {
    expect(richToPlain('BP &lt;185/110 &amp; <script>x</script>')).toBe('BP <185/110 & <script>x</script>');
  });

  it('keeps content when tags are unbalanced', () => {
    expect(richToPlain('<b>open only')).toBe('open only');
    expect(richToPlain('stray</b> close')).toBe('stray close');
  });
});
