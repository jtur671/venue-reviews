import { describe, expect, it } from 'vitest';
import { scoreToGrade, gradeColor, type LetterGrade } from '@/lib/utils/grades';

describe('Grade Utilities', () => {
  describe('scoreToGrade', () => {
    it('returns A for scores >= 9', () => {
      expect(scoreToGrade(9)).toBe('A');
      expect(scoreToGrade(9.0)).toBe('A');
      expect(scoreToGrade(9.5)).toBe('A');
      expect(scoreToGrade(10)).toBe('A');
      expect(scoreToGrade(10.0)).toBe('A');
    });

    it('returns B for scores >= 8 and < 9', () => {
      expect(scoreToGrade(8)).toBe('B');
      expect(scoreToGrade(8.0)).toBe('B');
      expect(scoreToGrade(8.9)).toBe('B');
      expect(scoreToGrade(8.99)).toBe('B');
    });

    it('returns C for scores >= 7 and < 8', () => {
      expect(scoreToGrade(7)).toBe('C');
      expect(scoreToGrade(7.0)).toBe('C');
      expect(scoreToGrade(7.9)).toBe('C');
      expect(scoreToGrade(7.99)).toBe('C');
    });

    it('returns D for scores >= 6 and < 7', () => {
      expect(scoreToGrade(6)).toBe('D');
      expect(scoreToGrade(6.0)).toBe('D');
      expect(scoreToGrade(6.9)).toBe('D');
      expect(scoreToGrade(6.99)).toBe('D');
    });

    it('returns F for scores < 6', () => {
      expect(scoreToGrade(5.9)).toBe('F');
      expect(scoreToGrade(5)).toBe('F');
      expect(scoreToGrade(1)).toBe('F');
      expect(scoreToGrade(0)).toBe('F');
      expect(scoreToGrade(0.5)).toBe('F');
    });

    it('returns null for null input', () => {
      expect(scoreToGrade(null)).toBeNull();
    });

    it('returns null for NaN input', () => {
      expect(scoreToGrade(NaN)).toBeNull();
    });

    it('handles edge cases at boundaries', () => {
      expect(scoreToGrade(9.0)).toBe('A');
      expect(scoreToGrade(8.999)).toBe('B');
      expect(scoreToGrade(8.0)).toBe('B');
      expect(scoreToGrade(7.999)).toBe('C');
      expect(scoreToGrade(7.0)).toBe('C');
      expect(scoreToGrade(6.999)).toBe('D');
      expect(scoreToGrade(6.0)).toBe('D');
      expect(scoreToGrade(5.999)).toBe('F');
    });
  });

  describe('gradeColor', () => {
    it('returns correct color for A grade', () => {
      expect(gradeColor('A')).toBe('#16a34a'); // green
    });

    it('returns correct color for B grade', () => {
      expect(gradeColor('B')).toBe('#22c55e'); // light green
    });

    it('returns correct color for C grade', () => {
      expect(gradeColor('C')).toBe('#eab308'); // yellow
    });

    it('returns correct color for D grade', () => {
      expect(gradeColor('D')).toBe('#f97316'); // orange
    });

    it('returns correct color for F grade', () => {
      expect(gradeColor('F')).toBe('#ef4444'); // red
    });

    it('returns neutral color for null', () => {
      expect(gradeColor(null)).toBe('#9ca3af'); // neutral grey
    });

    it('returns correct colors for all valid grades', () => {
      const grades: LetterGrade[] = ['A', 'B', 'C', 'D', 'F'];
      const colors = grades.map((g) => gradeColor(g));
      
      expect(colors[0]).toBe('#16a34a'); // A - green
      expect(colors[1]).toBe('#22c55e'); // B - light green
      expect(colors[2]).toBe('#eab308'); // C - yellow
      expect(colors[3]).toBe('#f97316'); // D - orange
      expect(colors[4]).toBe('#ef4444'); // F - red
    });
  });

  describe('integration: scoreToGrade + gradeColor', () => {
    it('produces valid colors for all score ranges', () => {
      const testScores = [10, 9, 8.5, 8, 7.5, 7, 6.5, 6, 5, 0];
      
      testScores.forEach((score) => {
        const grade = scoreToGrade(score);
        if (grade !== null) {
          const color = gradeColor(grade);
          expect(color).toBeTruthy();
          expect(color).toMatch(/^#[0-9a-f]{6}$/i); // Valid hex color
        }
      });
    });
  });
});
