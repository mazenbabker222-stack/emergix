/**
 * Upload validation by content, not by what the client claims.
 *
 * `validateUpload` sniffs magic bytes, then requires the file extension and (if sent) the
 * declared MIME type to agree with what the bytes really are. SVG and HTML/XML markup are
 * always detected so a script-bearing file renamed to `.png` is rejected as a mismatch and
 * can never be allowed by accident (neither type is in any preset policy).
 *
 * Pass at least the first 4096 bytes of the file as `head`; `size` is the full byte length.
 * Use a random storage key and never the user's filename on disk; `safeFileName` is for
 * display and Content-Disposition only.
 */

export type DetectedType = 'png' | 'jpeg' | 'gif' | 'webp' | 'pdf' | 'vtt' | 'csv' | 'svg' | 'markup' | 'unknown';

export interface TypeInfo {
  mime: string;
  extensions: readonly string[];
  /** Other MIME values browsers commonly send for the same content. */
  alsoAcceptedMimes?: readonly string[];
}

export const TYPE_INFO: Record<Exclude<DetectedType, 'svg' | 'markup' | 'unknown'>, TypeInfo> = {
  png: { mime: 'image/png', extensions: ['png'] },
  jpeg: { mime: 'image/jpeg', extensions: ['jpg', 'jpeg'] },
  gif: { mime: 'image/gif', extensions: ['gif'] },
  webp: { mime: 'image/webp', extensions: ['webp'] },
  pdf: { mime: 'application/pdf', extensions: ['pdf'] },
  vtt: { mime: 'text/vtt', extensions: ['vtt'] },
  csv: {
    mime: 'text/csv',
    extensions: ['csv'],
    alsoAcceptedMimes: ['application/csv', 'application/vnd.ms-excel', 'text/plain'],
  },
};

export type AllowedType = keyof typeof TYPE_INFO;

export interface UploadPolicy {
  allowed: readonly AllowedType[];
  maxBytes: number;
}

export const IMAGE_POLICY: UploadPolicy = { allowed: ['png', 'jpeg', 'webp', 'gif'], maxBytes: 5 * 1024 * 1024 };
export const DOCUMENT_POLICY: UploadPolicy = { allowed: ['pdf'], maxBytes: 20 * 1024 * 1024 };
export const CAPTION_POLICY: UploadPolicy = { allowed: ['vtt'], maxBytes: 1024 * 1024 };
export const IMPORT_POLICY: UploadPolicy = { allowed: ['csv'], maxBytes: 10 * 1024 * 1024 };

export interface UploadInput {
  filename: string;
  declaredMime?: string;
  size: number;
  head: Uint8Array;
}

export type UploadErrorCode = 'empty_file' | 'too_large' | 'invalid_filename' | 'unsupported_type' | 'type_mismatch';

export type UploadResult =
  | { ok: true; type: AllowedType; mime: string; extension: string; safeName: string }
  | { ok: false; code: UploadErrorCode; message: string };

const ascii = (bytes: Uint8Array, start: number, text: string): boolean => {
  if (bytes.length < start + text.length) return false;
  for (let i = 0; i < text.length; i++) if (bytes[start + i] !== text.charCodeAt(i)) return false;
  return true;
};

const startsWith = (bytes: Uint8Array, sig: readonly number[]): boolean =>
  bytes.length >= sig.length && sig.every((b, i) => bytes[i] === b);

function decodeText(bytes: Uint8Array): string | null {
  // Strip a UTF-8 BOM; `stream: true` tolerates a multi-byte character cut at the end of `head`.
  const body = startsWith(bytes, [0xef, 0xbb, 0xbf]) ? bytes.subarray(3) : bytes;
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(body, { stream: true });
  } catch {
    return null;
  }
}

function hasBadControlChars(text: string): boolean {
  // Allow tab, LF, CR; everything else below 0x20 (including NUL) means "not plain text".
  // eslint-disable-next-line no-control-regex
  return /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(text);
}

export function sniffFileType(head: Uint8Array): DetectedType {
  if (startsWith(head, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'png';
  if (startsWith(head, [0xff, 0xd8, 0xff])) return 'jpeg';
  if (ascii(head, 0, 'GIF87a') || ascii(head, 0, 'GIF89a')) return 'gif';
  if (ascii(head, 0, 'RIFF') && ascii(head, 8, 'WEBP')) return 'webp';
  if (ascii(head, 0, '%PDF-')) return 'pdf';

  const text = decodeText(head);
  if (text === null || hasBadControlChars(text)) return 'unknown';

  const trimmed = text.trimStart();
  if (trimmed.startsWith('WEBVTT')) return 'vtt';
  if (trimmed.startsWith('<')) return /<svg[\s>]/i.test(text) ? 'svg' : 'markup';
  if (trimmed.length === 0) return 'unknown';
  return 'csv'; // plain UTF-8 text; the caller's policy decides whether text is acceptable
}

export function safeFileName(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? '';
  // eslint-disable-next-line no-control-regex
  let clean = base.replace(/[\u0000-\u001f\u007f]/g, '').replace(/[^A-Za-z0-9._ -]/g, '_');
  clean = clean.replace(/^\.+/, '').replace(/\s+/g, ' ').trim();
  if (clean.length > 100) {
    const dot = clean.lastIndexOf('.');
    const ext = dot > 0 ? clean.slice(dot) : '';
    clean = clean.slice(0, 100 - ext.length) + ext;
  }
  return clean || 'file';
}

function extensionOf(safeName: string): string | null {
  const dot = safeName.lastIndexOf('.');
  if (dot <= 0 || dot === safeName.length - 1) return null;
  return safeName.slice(dot + 1).toLowerCase();
}

const fail = (code: UploadErrorCode, message: string): UploadResult => ({ ok: false, code, message });

export function validateUpload(input: UploadInput, policy: UploadPolicy): UploadResult {
  if (!Number.isFinite(input.size) || input.size <= 0 || input.head.length === 0) {
    return fail('empty_file', 'The file is empty.');
  }
  if (input.size > policy.maxBytes) {
    return fail('too_large', `The file is larger than the ${Math.floor(policy.maxBytes / (1024 * 1024))} MB limit.`);
  }

  const safeName = safeFileName(input.filename);
  const extension = extensionOf(safeName);
  if (!extension) return fail('invalid_filename', 'The file name must have an extension.');

  const detected = sniffFileType(input.head);
  if (detected === 'svg' || detected === 'markup' || detected === 'unknown') {
    return fail('unsupported_type', 'This file type is not allowed.');
  }
  if (!policy.allowed.includes(detected)) {
    return fail('unsupported_type', 'This file type is not allowed here.');
  }

  const info: TypeInfo = TYPE_INFO[detected];
  if (!info.extensions.includes(extension)) {
    return fail('type_mismatch', 'The file extension does not match the file contents.');
  }
  if (input.declaredMime) {
    const declared = input.declaredMime.split(';')[0]!.trim().toLowerCase();
    const accepted = [info.mime, ...(info.alsoAcceptedMimes ?? [])];
    if (!accepted.includes(declared)) {
      return fail('type_mismatch', 'The declared file type does not match the file contents.');
    }
  }

  return { ok: true, type: detected, mime: info.mime, extension, safeName };
}
