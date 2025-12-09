import { describe, expect, it } from 'vitest';
import {
  calculateOverallScore,
  calculateAverageScore,
  calculateAspectAverage,
  calculateAllAspectAverages,
  formatScore,
  getScoreColor,
} from '@/lib/utils/scores';
import { Review } from '@/types/venues';

describe('Score Utilities', () => {
  describe('calculateOverallScore', () => {
    it('calculates average correctly', () => {
      const aspects = {
        sound_score: 8,
        vibe_score: 7,
        staff_score: 9,
        layout_score: 8,
      };
      expect(calculateOverallScore(aspects)).toBe(8); // (8+7+9+8)/4 = 8
    });

    it('rounds to nearest integer', () => {
      const aspects = {
        sound_score: 7,
        vibe_score: 8,
        staff_score: 8,
        layout_score: 8,
      };
      expect(calculateOverallScore(aspects)).toBe(8); // (7+8+8+8)/4 = 7.75 → 8
    });

    it('handles perfect scores', () => {
      const aspects = {
        sound_score: 10,
        vibe_score: 10,
        staff_score: 10,
        layout_score: 10,
      };
      expect(calculateOverallScore(aspects)).toBe(10);
    });

    it('handles low scores', () => {
      const aspects = {
        sound_score: 1,
        vibe_score: 2,
        staff_score: 1,
        layout_score: 2,
      };
      expect(calculateOverallScore(aspects)).toBe(2); // (1+2+1+2)/4 = 1.5 → 2
    });
  });

  describe('calculateAverageScore', () => {
    it('calculates average from reviews', () => {
      const reviews: Review[] = [
        { id: '1', score: 8, reviewer: null, comment: null, created_at: '', sound_score: null, vibe_score: null, staff_score: null, layout_score: null },
        { id: '2', score: 7, reviewer: null, comment: null, created_at: '', sound_score: null, vibe_score: null, staff_score: null, layout_score: null },
        { id: '3', score: 9, reviewer: null, comment: null, created_at: '', sound_score: null, vibe_score: null, staff_score: null, layout_score: null },
      ];
      expect(calculateAverageScore(reviews)).toBe(8); // (8+7+9)/3 = 8
    });

    it('returns null for empty array', () => {
      expect(calculateAverageScore([])).toBeNull();
    });

    it('handles reviews with null scores', () => {
      const reviews: Review[] = [
        { id: '1', score: 8, reviewer: null, comment: null, created_at: '', sound_score: null, vibe_score: null, staff_score: null, layout_score: null },
        { id: '2', score: 0, reviewer: null, comment: null, created_at: '', sound_score: null, vibe_score: null, staff_score: null, layout_score: null },
      ];
      expect(calculateAverageScore(reviews)).toBe(4); // (8+0)/2 = 4
    });
  });

  describe('calculateAspectAverage', () => {
    it('calculates average for specific aspect', () => {
      const reviews: Review[] = [
        { id: '1', score: 8, reviewer: null, comment: null, created_at: '', sound_score: 8, vibe_score: null, staff_score: null, layout_score: null },
        { id: '2', score: 7, reviewer: null, comment: null, created_at: '', sound_score: 7, vibe_score: null, staff_score: null, layout_score: null },
        { id: '3', score: 9, reviewer: null, comment: null, created_at: '', sound_score: 9, vibe_score: null, staff_score: null, layout_score: null },
      ];
      expect(calculateAspectAverage(reviews, 'sound_score')).toBe(8);
    });

    it('filters out null values', () => {
      const reviews: Review[] = [
        { id: '1', score: 8, reviewer: null, comment: null, created_at: '', sound_score: 8, vibe_score: null, staff_score: null, layout_score: null },
        { id: '2', score: 7, reviewer: null, comment: null, created_at: '', sound_score: null, vibe_score: null, staff_score: null, layout_score: null },
        { id: '3', score: 9, reviewer: null, comment: null, created_at: '', sound_score: 9, vibe_score: null, staff_score: null, layout_score: null },
      ];
      expect(calculateAspectAverage(reviews, 'sound_score')).toBe(8.5); // (8+9)/2 = 8.5
    });

    it('returns null when no valid values', () => {
      const reviews: Review[] = [
        { id: '1', score: 8, reviewer: null, comment: null, created_at: '', sound_score: null, vibe_score: null, staff_score: null, layout_score: null },
      ];
      expect(calculateAspectAverage(reviews, 'sound_score')).toBeNull();
    });

    it('filters out invalid scores (out of range)', () => {
      const reviews: Review[] = [
        { id: '1', score: 8, reviewer: null, comment: null, created_at: '', sound_score: 8, vibe_score: null, staff_score: null, layout_score: null },
        { id: '2', score: 7, reviewer: null, comment: null, created_at: '', sound_score: 15, vibe_score: null, staff_score: null, layout_score: null }, // invalid
        { id: '3', score: 9, reviewer: null, comment: null, created_at: '', sound_score: 0, vibe_score: null, staff_score: null, layout_score: null }, // invalid
      ];
      expect(calculateAspectAverage(reviews, 'sound_score')).toBe(8);
    });
  });

  describe('calculateAllAspectAverages', () => {
    it('calculates all aspect averages', () => {
      const reviews: Review[] = [
        {
          id: '1',
          score: 8,
          reviewer: null,
          comment: null,
          created_at: '',
          sound_score: 8,
          vibe_score: 7,
          staff_score: 9,
          layout_score: 8,
        },
        {
          id: '2',
          score: 7,
          reviewer: null,
          comment: null,
          created_at: '',
          sound_score: 7,
          vibe_score: 6,
          staff_score: 8,
          layout_score: 7,
        },
      ];
      const result = calculateAllAspectAverages(reviews);
      expect(result.sound).toBe(7.5); // (8+7)/2
      expect(result.vibe).toBe(6.5); // (7+6)/2
      expect(result.staff).toBe(8.5); // (9+8)/2
      expect(result.layout).toBe(7.5); // (8+7)/2
    });
  });

  describe('formatScore', () => {
    it('formats score to 1 decimal place', () => {
      expect(formatScore(8.5)).toBe('8.5');
      expect(formatScore(7.75)).toBe('7.8');
      expect(formatScore(9)).toBe('9.0');
    });

    it('returns dash for null', () => {
      expect(formatScore(null)).toBe('—');
      expect(formatScore(undefined)).toBe('—');
    });
  });

  describe('getScoreColor', () => {
    it('returns green for scores >= 8', () => {
      expect(getScoreColor(8)).toBe('#10b981');
      expect(getScoreColor(9)).toBe('#10b981');
      expect(getScoreColor(10)).toBe('#10b981');
    });

    it('returns amber for scores >= 6 and < 8', () => {
      expect(getScoreColor(6)).toBe('#f59e0b');
      expect(getScoreColor(7)).toBe('#f59e0b');
      expect(getScoreColor(7.9)).toBe('#f59e0b');
    });

    it('returns red for scores < 6', () => {
      expect(getScoreColor(5)).toBe('#ef4444');
      expect(getScoreColor(1)).toBe('#ef4444');
    });

    it('returns muted color for null', () => {
      expect(getScoreColor(null)).toBe('var(--text-muted)');
    });
  });
});
