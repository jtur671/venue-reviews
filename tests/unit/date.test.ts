import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import {
  formatDateShort,
  formatDateFull,
  formatDate,
  getRelativeTime,
} from '@/lib/utils/date';

describe('Date Utilities', () => {
  beforeEach(() => {
    // Mock current date to Dec 9, 2024, 12:00 PM
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-12-09T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('formatDateShort', () => {
    it('formats date to short format', () => {
      const result = formatDateShort('2024-12-09T12:00:00Z');
      expect(result).toBeTruthy();
      expect(result.length).toBeGreaterThan(0);
      // Should contain month abbreviation and day
      expect(result).toMatch(/\w+\s+\d+/);
    });

    it('returns empty string for null', () => {
      expect(formatDateShort(null)).toBe('');
      expect(formatDateShort(undefined)).toBe('');
    });

    it('handles various date formats', () => {
      const date1 = formatDateShort('2024-01-15');
      expect(date1).toBeTruthy();
      expect(date1.length).toBeGreaterThan(0);

      const date2 = formatDateShort('2024-06-30');
      expect(date2).toBeTruthy();
      expect(date2.length).toBeGreaterThan(0);
    });
  });

  describe('formatDateFull', () => {
    it('formats date to full format', () => {
      const result = formatDateFull('2024-12-09T12:00:00Z');
      expect(result).toBeTruthy();
      expect(result.length).toBeGreaterThan(0);
      // Should contain month, day, and year
      expect(result).toMatch(/\w+\s+\d+,\s+\d{4}/);
    });

    it('returns empty string for null', () => {
      expect(formatDateFull(null)).toBe('');
      expect(formatDateFull(undefined)).toBe('');
    });
  });

  describe('formatDate', () => {
    it('formats date with custom options', () => {
      const result = formatDate('2024-12-09T12:00:00Z', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      });
      expect(result).toBeTruthy();
      expect(result.length).toBeGreaterThan(0);
      // Should contain full month name, day, and year
      expect(result).toMatch(/\w+\s+\d+,\s+\d{4}/);
    });

    it('uses default options when none provided', () => {
      const result = formatDate('2024-12-09T12:00:00Z');
      expect(result).toBeTruthy();
    });

    it('returns empty string for null', () => {
      expect(formatDate(null)).toBe('');
      expect(formatDate(undefined)).toBe('');
    });
  });

  describe('getRelativeTime', () => {
    it('returns "just now" for very recent times', () => {
      const recent = new Date('2024-12-09T11:59:30Z').toISOString();
      expect(getRelativeTime(recent)).toBe('just now');
    });

    it('returns minutes ago for recent times', () => {
      const fiveMinutesAgo = new Date('2024-12-09T11:55:00Z').toISOString();
      expect(getRelativeTime(fiveMinutesAgo)).toBe('5 minutes ago');
    });

    it('returns hours ago', () => {
      const twoHoursAgo = new Date('2024-12-09T10:00:00Z').toISOString();
      expect(getRelativeTime(twoHoursAgo)).toBe('2 hours ago');
    });

    it('returns days ago', () => {
      const threeDaysAgo = new Date('2024-12-06T12:00:00Z').toISOString();
      expect(getRelativeTime(threeDaysAgo)).toBe('3 days ago');
    });

    it('returns weeks ago', () => {
      const twoWeeksAgo = new Date('2024-11-25T12:00:00Z').toISOString();
      expect(getRelativeTime(twoWeeksAgo)).toBe('2 weeks ago');
    });

    it('returns months ago', () => {
      const twoMonthsAgo = new Date('2024-10-09T12:00:00Z').toISOString();
      expect(getRelativeTime(twoMonthsAgo)).toBe('2 months ago');
    });

    it('returns years ago', () => {
      const oneYearAgo = new Date('2023-12-09T12:00:00Z').toISOString();
      expect(getRelativeTime(oneYearAgo)).toBe('1 years ago');
    });

    it('returns empty string for null', () => {
      expect(getRelativeTime(null)).toBe('');
      expect(getRelativeTime(undefined)).toBe('');
    });
  });
});
