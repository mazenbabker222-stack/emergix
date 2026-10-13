import { describe, expect, it } from 'vitest';
import { brand } from './brand';

describe('brand config', () => {
  it('uses the Emergix Academy name and contact number', () => {
    expect(brand.name).toBe('Emergix Academy');
    expect(brand.nameParts.join(' ')).toBe(brand.name);
    expect(brand.phone).toBe('0563169123');
  });

  it('carries the required legal disclaimer', () => {
    expect(brand.legalDisclaimer).toBe(
      'Not affiliated with or endorsed by the Royal College of Emergency Medicine.',
    );
  });

  it('contains no trace of the old brand', () => {
    expect(JSON.stringify(brand).toLowerCase()).not.toContain('oscepass');
  });
});
