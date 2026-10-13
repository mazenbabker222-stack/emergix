import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return name === 'ui' ? [] : sourceFiles(full);
    return /\.(ts|tsx)$/.test(name) && !name.endsWith('.test.ts') ? [full] : [];
  });
}

describe('session handling', () => {
  it('keeps browser storage limited to non-sensitive preferences (sessions live in httpOnly cookies)', () => {
    const root = join(import.meta.dirname, '..');
    const allowedPreferenceStorage = new Set(['features/osce/lib/audio.ts', 'lib/safeStorage.ts']);
    const offenders = sourceFiles(root).filter((file) => {
      const source = readFileSync(file, 'utf8');
      const relativePath = file.slice(root.length + 1).replaceAll('\\', '/');
      const usesBrowserStorage = /\b(localStorage|sessionStorage)\b/.test(source);
      const usesSafeStorageInAuth = /\bsafe(?:Get|Set)\s*\(/.test(source) && /\/features\/(?:auth|account|admin)\//.test(`/${relativePath}`);
      return (usesBrowserStorage && !allowedPreferenceStorage.has(relativePath)) || usesSafeStorageInAuth;
    });
    expect(offenders).toEqual([]);
  });
});
