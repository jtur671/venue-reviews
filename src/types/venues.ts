export type VenueWithStats = {
  id: string;
  name: string;
  city: string;
  avgScore: number | null;
  reviewCount: number;
  latestReviewAt?: string | null;
};

export type RemoteVenue = {
  id: string;
  name: string;
  city: string;
  country: string;
  address: string;
};

export type DraftVenue = {
  name?: string;
  city?: string;
  country?: string;
  address?: string;
} | null;

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
};
