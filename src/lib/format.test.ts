import { describe, expect, it } from 'vitest';
import { date, money } from './format';

describe('format helpers', () => {
  it('renders malformed and missing dates safely', () => {
    expect(date(undefined)).toBe('—');
    expect(date('not-a-date')).toBe('—');
  });

  it('falls back to zero for malformed currency values', () => {
    expect(money('not-a-number')).toBe(money(0));
  });
});
