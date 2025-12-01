# Live Venues

A Next.js app that lists concert venues, lets fans leave reviews, and shows
per-venue stats powered by Supabase.

## Features

- Home page lists venues with average score + review count
- Detail page loads venue metadata, reviews, and lets visitors submit a new
  review inline
- Supabase client is shared between the UI and Vitest integration tests

## Prerequisites

- Node.js 20+
- Supabase project with `venues` and `reviews` tables (matching the schema used
  in the dashboard screenshots)

## Environment Variables

Create `.env.local` with your Supabase credentials:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

These values are used at runtime _and_ when running the Vitest suite.

## Setup & Development

```bash
npm install
npm run dev
# open http://localhost:3000
```

The UI is client-side, so hot reloading reflects Supabase changes as soon as you
refresh.

## Testing

```bash
npm test
```

The tests run against your real Supabase project and currently cover:

1. Basic connectivity (ensuring env vars are set and venues can be queried)
2. Reading reviews for a known venue ID
3. Inserting a review and cleaning it up

Update `tests/fixtures.ts` if you change the seed venue ID that should exist in
your database. Because the tests mutate data, the credentials you supply must
have permission to insert/delete rows in `reviews`.

## Deployment

Deploy as a regular Next.js 16 app (Vercel, Netlify, or any Node host). Remember
to set the same Supabase env vars in the hosting platform so the app and tests
can access your data.
