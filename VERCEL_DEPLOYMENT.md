# Vercel Deployment Checklist

## ✅ Pre-Deployment

Your project is ready for Vercel deployment! Here's what you need to do:

## 1. Environment Variables

Set these in your Vercel project settings (Settings → Environment Variables):

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
GOOGLE_PLACES_API_KEY=your_google_places_key
```

**Important:** Make sure to add these for **Production**, **Preview**, and **Development** environments.

## 2. Build Settings

Vercel will automatically detect Next.js and use these settings:
- **Framework Preset:** Next.js
- **Build Command:** `npm run build` (auto-detected)
- **Output Directory:** `.next` (auto-detected)
- **Install Command:** `npm install` (auto-detected)

No additional configuration needed!

## 3. Supabase Auth Redirect URLs

In your Supabase dashboard (Authentication → URL Configuration), add your Vercel domain:

- Production: `https://your-project.vercel.app/auth/callback`
- Preview: `https://your-project-*.vercel.app/auth/callback`

This ensures anonymous authentication works on Vercel.

## 4. What's Already Configured

✅ Next.js 16.0.7 properly configured
✅ Build uses webpack (no Turbopack issues)
✅ `outputFileTracingRoot` is conditional (only used locally, not on Vercel)
✅ All dependencies are in `package.json`
✅ TypeScript configuration is correct

## 5. Deployment Steps

1. Push your code to GitHub/GitLab/Bitbucket
2. Import the repository in Vercel
3. Add environment variables (see #1 above)
4. Deploy!

Vercel will automatically:
- Run `npm install`
- Run `npm run build`
- Deploy your app

## Troubleshooting

If you encounter any issues:

1. **Build fails:** Check the build logs in Vercel dashboard
2. **Environment variables not working:** Make sure they're set for the correct environment (Production/Preview)
3. **Auth not working:** Verify redirect URLs in Supabase match your Vercel domain

## Notes

- The `outputFileTracingRoot` config is only used locally to avoid lockfile warnings
- On Vercel, this config is automatically skipped (via `process.env.VERCEL` check)
- Your build should work perfectly on Vercel!
