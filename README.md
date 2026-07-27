# Squishy Bread

## Run locally

```bash
npm install
npm run dev
```

Country Ranking works in mock/offline mode when Supabase variables are missing.

## Supabase setup

1. Create a Supabase project.
2. Enable **Authentication → Providers → Anonymous sign-ins**.
3. Run [`supabase/schema.sql`](supabase/schema.sql) in the SQL editor.
4. Set these Vite variables locally or in Vercel:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

The app signs users in anonymously, stores the auth UUID locally, and upserts their profile through `sync_profile`. Missing envs, failed auth, offline mode, and failed queries fall back to local/mock data without blocking play.

## Deploy to Vercel

Use the existing GitHub repository, framework preset **Vite**, build command `npm run build`, and output directory `dist`. Add the two `VITE_` variables in Vercel Project Settings, then redeploy.

## MVP limitations

The client throttles writes, never intentionally decreases score, and the SQL function uses `greatest()` for score/combo/press totals. Client state can still be modified by a determined user; this is not complete anti-cheat. For production, move scoring validation and score submission into a Supabase Edge Function and derive scores from signed gameplay events.
