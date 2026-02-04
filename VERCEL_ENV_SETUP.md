# Vercel Environment Variables Setup

To fix the Supabase error on Vercel (`VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set`), you need to add these environment variables in your Vercel project settings.

## Steps to Add Environment Variables in Vercel:

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project: `quiz-web-app-sandy`
3. Go to **Settings** → **Environment Variables**
4. Add the following variables:

### For Production:
- **Name**: `VITE_SUPABASE_URL`
- **Value**: `https://lpxulhmzmrtotcczzzwa.supabase.co`
- **Environment**: Production, Preview, Development

- **Name**: `VITE_SUPABASE_ANON_KEY`
- **Value**: Your Supabase anon key (get it from Supabase Dashboard → Project Settings → API → anon/public key)
- **Environment**: Production, Preview, Development

- **Name**: `VITE_API_URL`
- **Value**: Your backend API URL (e.g., `https://your-backend-domain.com/api`)
- **Environment**: Production, Preview, Development

## After Adding Variables:

1. Go to **Deployments** tab
2. Click the **⋯** (three dots) on the latest deployment
3. Click **Redeploy** to apply the new environment variables

Or simply push a new commit to trigger a redeploy with the new variables.

## Getting Your Supabase Anon Key:

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to **Settings** → **API**
4. Copy the **anon/public** key (NOT the service_role key - that's secret!)
