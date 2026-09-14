import { describe, expect, it } from 'vitest';
import { getSafeInternalPath } from './redirect';

describe('getSafeInternalPath', () => {
  it('keeps app-relative paths', () => {
    expect(getSafeInternalPath('/dashboard/classes?status=active', '/login')).toBe('/dashboard/classes?status=active');
  });

  it('falls back for empty values', () => {
    expect(getSafeInternalPath(null, '/login')).toBe('/login');
    expect(getSafeInternalPath('', '/dashboard')).toBe('/dashboard');
  });

  it('blocks protocol-relative and external paths', () => {
    expect(getSafeInternalPath('//evil.test', '/login')).toBe('/login');
    expect(getSafeInternalPath('https://evil.test', '/login')).toBe('/login');
  });
});
