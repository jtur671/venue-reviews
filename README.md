# Live Venues

> Rotten Tomatoes for live rooms: search promoters’ favorite venues, pull in web results, and leave anonymous report cards.

## Features

- **Community data** – Each venue shows averaged overall + Sound/Vibe/Staff/Layout scores from Supabase reviews.
- **Remote discovery** – Google Places search runs in the browser and surfaces venues that aren’t in Supabase yet, with a one-click “Create report card” CTA.
- **Anonymous auth** – Every browser silently signs in via `supabase.auth.signInAnonymously()` so users can add reviews without an account. Duplicate reviews per browser are blocked at the DB level.
- **Per-aspect sliders** – Reviewers rate 4 categories; the UI calculates the overall score and stores all fields in the `reviews` table.
- **Vitest integration tests** – Live tests that exercise Supabase connectivity and mutation paths.

## Prerequisites

- Node.js 20+
- A Supabase project with `venues` and `reviews` tables. `reviews` should include:
  - `score`, `sound_score`, `vibe_score`, `staff_score`, `layout_score` (ints 1–10)
  - `reviewer_name`, `comment`, `user_id`, `venue_id`
  - Unique constraint on `(user_id, venue_id)` so each anonymous browser can only rate once
- Supabase Auth → **Enable anonymous sign-ins** (Authentication → Providers → “Email” tab → toggle “Allow anonymous sign-ins”)

## Environment Variables

Create `.env.local` (and mirror in your hosting provider):

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
GOOGLE_PLACES_API_KEY=your_google_places_key
```

- `NEXT_PUBLIC_*` keys power the client and Vitest.
- `GOOGLE_PLACES_API_KEY` is used server-side in `app/api/search-venues/route.ts` to hit the Places Text Search API.

## Setup

```bash
npm install
npm run dev
# open http://localhost:3000
```

The app is built in the Next.js App Router, so local hot reloads update instantly.

## Testing

```bash
npm test
```

We run Vitest against the live Supabase project. Tests cover:

1. Connectivity/env checking
2. Querying venues with reviews
3. Inserting + deleting a review
4. Inserting + deleting a venue

Edit `tests/fixtures.ts` if you change the “known venue” seed. Because the tests write to Supabase, use an account with insert/delete rights in CI.

## Deployment

Deploy like any other Next.js 16 project (Vercel, Netlify, Render, Fly.io, etc.). Remember to provide:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `GOOGLE_PLACES_API_KEY`

If you run `next dev`/`next start` behind a proxy, ensure Supabase Auth’s redirect URL includes your domain so anonymous sessions work outside localhost.
