import { describe, expect, it } from 'vitest';
import {
  CAPTION_POLICY,
  DOCUMENT_POLICY,
  IMAGE_POLICY,
  IMPORT_POLICY,
  safeFileName,
  sniffFileType,
  validateUpload,
} from './uploads';

const bytes = (...n: number[]) => new Uint8Array(n);
const text = (s: string) => new TextEncoder().encode(s);
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
const JPEG = bytes(0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0x4a, 0x46);
const WEBP = new Uint8Array([...text('RIFF'), 1, 2, 3, 4, ...text('WEBPVP8 ')]);
const PDF = text('%PDF-1.7\n%âãÏÓ');

const up = (filename: string, head: Uint8Array, declaredMime?: string, size = head.length) => ({
  filename,
  head,
  declaredMime,
  size,
});

describe('sniffFileType', () => {
  it('detects binary formats by magic bytes', () => {
    expect(sniffFileType(PNG)).toBe('png');
    expect(sniffFileType(JPEG)).toBe('jpeg');
    expect(sniffFileType(text('GIF89a....'))).toBe('gif');
    expect(sniffFileType(WEBP)).toBe('webp');
    expect(sniffFileType(PDF)).toBe('pdf');
  });
  it('detects captions, csv, svg and markup', () => {
    expect(sniffFileType(text('\uFEFFWEBVTT\n\n00:00.000 --> 00:01.000\nHi'))).toBe('vtt');
    expect(sniffFileType(text('id,question\n1,"What is 2+2?"\n'))).toBe('csv');
    expect(sniffFileType(text('<?xml version="1.0"?><svg onload="x()"></svg>'))).toBe('svg');
    expect(sniffFileType(text('  <!doctype html><script>x</script>'))).toBe('markup');
  });
  it('returns unknown for binary junk, NUL bytes and empty text', () => {
    expect(sniffFileType(bytes(1, 2, 3, 4, 5))).toBe('unknown');
    expect(sniffFileType(text('a,b\u0000c'))).toBe('unknown');
    expect(sniffFileType(text('   \n '))).toBe('unknown');
    expect(sniffFileType(bytes(0xc3, 0x28))).toBe('unknown'); // invalid UTF-8
  });
  it('tolerates a multi-byte character cut at the end of the head', () => {
    const full = text('name,نص\n');
    expect(sniffFileType(full.subarray(0, full.length - 3))).toBe('csv');
  });
});

describe('validateUpload', () => {
  it('accepts a genuine png with matching name and MIME', () => {
    const r = validateUpload(up('diagram.PNG', PNG, 'image/png'), IMAGE_POLICY);
    expect(r).toEqual({ ok: true, type: 'png', mime: 'image/png', extension: 'png', safeName: 'diagram.PNG' });
  });
  it('accepts jpg/jpeg extensions and MIME with charset parameters', () => {
    expect(validateUpload(up('a.jpg', JPEG), IMAGE_POLICY).ok).toBe(true);
    expect(validateUpload(up('a.jpeg', JPEG, 'image/jpeg; charset=binary'), IMAGE_POLICY).ok).toBe(true);
  });
  it('rejects SVG disguised as png, whatever it claims', () => {
    const svg = text('<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"></svg>');
    for (const name of ['x.png', 'x.svg']) {
      const r = validateUpload(up(name, svg, 'image/png'), IMAGE_POLICY);
      expect(r).toMatchObject({ ok: false, code: 'unsupported_type' });
    }
  });
  it('rejects HTML and executables renamed to allowed extensions', () => {
    expect(validateUpload(up('notes.pdf', text('<html><script>1</script></html>')), DOCUMENT_POLICY)).toMatchObject({
      ok: false,
      code: 'unsupported_type',
    });
    expect(validateUpload(up('photo.png', text('MZ\u0090\u0000\u0003')), IMAGE_POLICY)).toMatchObject({
      ok: false,
      code: 'unsupported_type',
    });
  });
  it('rejects extension and MIME mismatches', () => {
    expect(validateUpload(up('photo.jpg', PNG), IMAGE_POLICY)).toMatchObject({ ok: false, code: 'type_mismatch' });
    expect(validateUpload(up('photo.png', PNG, 'image/jpeg'), IMAGE_POLICY)).toMatchObject({
      ok: false,
      code: 'type_mismatch',
    });
    // only the last extension counts
    expect(validateUpload(up('photo.png.exe', PNG), IMAGE_POLICY)).toMatchObject({ ok: false, code: 'type_mismatch' });
  });
  it('enforces the policy allow-list per upload kind', () => {
    expect(validateUpload(up('a.pdf', PDF, 'application/pdf'), IMAGE_POLICY)).toMatchObject({
      ok: false,
      code: 'unsupported_type',
    });
    expect(validateUpload(up('a.pdf', PDF, 'application/pdf'), DOCUMENT_POLICY).ok).toBe(true);
  });
  it('enforces size and emptiness, using the real size rather than the head length', () => {
    expect(validateUpload(up('a.png', PNG, undefined, IMAGE_POLICY.maxBytes + 1), IMAGE_POLICY)).toMatchObject({
      ok: false,
      code: 'too_large',
    });
    expect(validateUpload(up('a.png', PNG, undefined, IMAGE_POLICY.maxBytes), IMAGE_POLICY).ok).toBe(true);
    expect(validateUpload(up('a.png', new Uint8Array(0), undefined, 0), IMAGE_POLICY)).toMatchObject({
      ok: false,
      code: 'empty_file',
    });
  });
  it('requires a file extension', () => {
    expect(validateUpload(up('README', PNG), IMAGE_POLICY)).toMatchObject({ ok: false, code: 'invalid_filename' });
    expect(validateUpload(up('.png', PNG), IMAGE_POLICY)).toMatchObject({ ok: false, code: 'invalid_filename' });
  });
  it('accepts captions and csv imports, with common browser MIME variants for csv', () => {
    expect(validateUpload(up('en.vtt', text('WEBVTT\n\n'), 'text/vtt'), CAPTION_POLICY).ok).toBe(true);
    const csv = text('id,stem\n1,Hello\n');
    expect(validateUpload(up('q.csv', csv, 'text/csv'), IMPORT_POLICY).ok).toBe(true);
    expect(validateUpload(up('q.csv', csv, 'application/vnd.ms-excel'), IMPORT_POLICY).ok).toBe(true);
    expect(validateUpload(up('q.csv', csv, 'image/png'), IMPORT_POLICY)).toMatchObject({
      ok: false,
      code: 'type_mismatch',
    });
  });
});

describe('safeFileName', () => {
  it('strips paths, control characters and unsafe characters', () => {
    expect(safeFileName('../../etc/passwd')).toBe('passwd');
    expect(safeFileName('C:\\Users\\me\\a b?.png')).toBe('a b_.png');
    expect(safeFileName('evil\u0000.png')).toBe('evil.png');
    expect(safeFileName('.htaccess')).toBe('htaccess');
    expect(safeFileName('')).toBe('file');
  });
  it('truncates long names but keeps the extension', () => {
    const out = safeFileName(`${'a'.repeat(300)}.pdf`);
    expect(out).toHaveLength(100);
    expect(out.endsWith('.pdf')).toBe(true);
  });
});
