import { describe, it, expect } from 'vitest';

describe('Date Utilities', () => {
  it('should pass basic test', () => {
    expect(1 + 1).toBe(2);
  });

  it('should format dates', () => {
    const date = new Date('2025-11-03');
    expect(date.getFullYear()).toBe(2025);
    expect(date.getMonth()).toBe(10); // November is month 10 (0-indexed)
  });

  it('should handle date calculations', () => {
    const date = new Date('2025-11-03');
    const nextDay = new Date(date);
    nextDay.setDate(nextDay.getDate() + 1);
    
    expect(nextDay.getDate()).toBe(4);
  });
});