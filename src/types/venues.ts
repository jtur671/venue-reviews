export type VenueWithStats = {
  id: string;
  name: string;
  city: string;
  avgScore: number | null;
  reviewCount: number;
  latestReviewAt?: string | null;
  photo_url?: string | null;
  google_place_id?: string | null;
  artistScore: number | null;
  fanScore: number | null;
  artistCount: number;
  fanCount: number;
};

export type RemoteVenue = {
  id: string;
  name: string;
  city: string;
  country: string;
  address: string;
  photoUrl?: string | null;
  googlePlaceId?: string;
};

export type DraftVenue = {
  name?: string;
  city?: string;
  country?: string;
  address?: string;
  photoUrl?: string | null;
  googlePlaceId?: string;
} | null;

export type AspectKey = 'sound_score' | 'vibe_score' | 'staff_score' | 'layout_score';

export const DEFAULT_ASPECT_SCORE = 7;

export const DEFAULT_ASPECTS: Record<AspectKey, number> = {
  sound_score: DEFAULT_ASPECT_SCORE,
  vibe_score: DEFAULT_ASPECT_SCORE,
  staff_score: DEFAULT_ASPECT_SCORE,
  layout_score: DEFAULT_ASPECT_SCORE,
};

export type Review = {
  id: string;
  reviewer: string | null;
  reviewer_name?: string | null;
  score: number;
  comment: string | null;
  created_at: string;
  sound_score: number | null;
  vibe_score: number | null;
  staff_score: number | null;
  layout_score: number | null;
  user_id?: string | null;
  reviewer_role?: 'artist' | 'fan' | null;
};
