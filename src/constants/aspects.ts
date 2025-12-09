import { AspectKey } from '@/types/venues';

export type AspectConfig = {
  key: AspectKey;
  label: string;
  icon: string;
  color: string;
};

export const ASPECTS: AspectConfig[] = [
  { key: 'sound_score', label: 'Sound', icon: '🎚️', color: '#2563eb' },
  { key: 'vibe_score', label: 'Vibe / Crowd', icon: '🎧', color: '#a855f7' },
  { key: 'staff_score', label: 'Staff / Bar', icon: '🍺', color: '#f59e0b' },
  { key: 'layout_score', label: 'Layout / Sightlines', icon: '👀', color: '#10b981' },
];
