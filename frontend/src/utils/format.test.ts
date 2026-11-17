import { describe, expect, it } from 'vitest';
import { formatSalary } from './format';

describe('formatSalary', () => {
  it('formats ranges and open-ended values', () => {
    expect(formatSalary({ min: 50000, max: 70000, currency: 'EUR' })).toBe('€50,000 – €70,000');
    expect(formatSalary({ min: 40000, max: null, currency: 'USD' })).toBe('From $40,000');
    expect(formatSalary({ min: null, max: 90000, currency: 'USD' })).toBe('Up to $90,000');
  });

  it('returns null when there is nothing to show', () => {
    expect(formatSalary(null)).toBeNull();
    expect(formatSalary({ min: null, max: null, currency: 'EUR' })).toBeNull();
    expect(formatSalary({ min: 1, max: 2, currency: null })).toBeNull();
  });
});
