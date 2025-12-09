export type LetterGrade = 'A' | 'B' | 'C' | 'D' | 'F';

export function scoreToGrade(score: number | null): LetterGrade | null {
  if (score == null || Number.isNaN(score)) return null;
  if (score >= 9) return 'A';
  if (score >= 8) return 'B';
  if (score >= 7) return 'C';
  if (score >= 6) return 'D';
  return 'F';
}

export function gradeColor(grade: LetterGrade | null): string {
  switch (grade) {
    case 'A':
      return '#16a34a'; // green
    case 'B':
      return '#22c55e'; // light green
    case 'C':
      return '#eab308'; // yellow
    case 'D':
      return '#f97316'; // orange
    case 'F':
      return '#ef4444'; // red
    default:
      return '#9ca3af'; // neutral
  }
}
