# QuizApp – Publish to GitHub & Host as a Website

This guide covers pushing the project to GitHub and deploying the frontend and backend so the app works as a live website, with correct API and navigation.

---

## Part 1: Publish to GitHub

### 1.1 Create a new repository on GitHub

1. Go to [github.com](https://github.com) and sign in.
2. Click **New repository** (or **+** → **New repository**).
3. Set **Repository name** (e.g. `quizapp`).
4. Choose **Public**.
5. Do **not** check “Add a README” (you already have a project).
6. Click **Create repository**.

### 1.2 Push your project from your machine

In a terminal, from your project root (`QuizApp Gen`):

```bash
# Initialize Git (if not already)
git init

# Add all files (respects .gitignore)
git add .

# First commit
git commit -m "Initial commit: QuizApp full stack"

# Rename default branch to main (if needed)
git branch -M main

# Add your GitHub repo as remote (replace YOUR_USERNAME and YOUR_REPO with yours)
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git

# Push
git push -u origin main
```

If the repo already had a remote:

```bash
git remote set-url origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

Your code is now on GitHub.

---

## Part 2: Environment variables for production

### 2.1 Backend (API)

On your **backend** host, set these in the dashboard (e.g. Render, Railway):

| Variable | Example (production) | Notes |
|----------|----------------------|--------|
| `NODE_ENV` | `production` | |
| `PORT` | `5000` or host default | Often set by the host |
| `CLIENT_URL` | `https://your-app.vercel.app` | **Frontend URL** so CORS allows it. For multiple origins use comma: `https://app.com,https://www.app.com` |
| `JWT_SECRET` | long random string | Keep secret, never in frontend |
| `JWT_EXPIRES_IN` | `1d` or `7d` | |
| `ANSWER_ENCRYPTION_KEY` | 32+ character key | Keep secret |
| `SUPABASE_URL` | `https://xxx.supabase.co` | From Supabase project |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJ...` | From Supabase, keep secret |
| `SUPABASE_STORAGE_BUCKET` | `question-images` | Optional |
| `RESEND_API_KEY` | `re_xxx` from Resend | For password reset / welcome emails |
| `EMAIL_FROM` | `QuizApp <no-reply@quizapp.com>` | Verified sender address in Resend |

### 2.2 Frontend (website)

On your **frontend** host (Vercel, Netlify, etc.), set:

| Variable | Example (production) | Notes |
|----------|----------------------|--------|
| `VITE_API_URL` | `https://your-api.onrender.com/api` | **Backend API base URL** (must end with `/api` if your API is under `/api`) |

That’s all the frontend needs for API navigation: the app will call this URL for all requests.

---

## Part 3: Deploy backend (API)

Deploy the **backend** folder as a Node.js service so it’s available at a URL like `https://quizapp-api.onrender.com`.

### Option A: Render

1. Go to [render.com](https://render.com) and sign in (GitHub).
2. **New** → **Web Service**.
3. Connect the GitHub repo and choose it.
4. Configure:
   - **Root Directory**: `backend`
   - **Runtime**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance**: Free (or paid)
5. **Environment**: Add all backend variables from the table above. Set `CLIENT_URL` to your **frontend** URL (e.g. `https://your-app.vercel.app`).
6. Create. Note the service URL, e.g. `https://quizapp-api.onrender.com`.

### Option B: Railway

1. Go to [railway.app](https://railway.app), sign in with GitHub.
2. **New Project** → **Deploy from GitHub** → select repo.
3. Set **Root Directory** to `backend`.
4. In **Variables**, add the same env vars; set `CLIENT_URL` to your frontend URL.
5. Deploy and copy the public URL (e.g. `https://quizapp-api.up.railway.app`).

Use the backend URL as the **API URL** in the next step (e.g. `https://.../api` if your routes are under `/api`).

---

## Part 4: Deploy frontend (website)

Deploy the **frontend** so it’s a static site that talks to your backend and handles client-side routing (all routes open the SPA).

### 4.1 Set API URL

In the frontend host’s **Environment variables**, set:

- **VITE_API_URL** = your backend API base, e.g.  
  `https://quizapp-api.onrender.com/api`

Build and deploy; the built app will use this for all API calls and navigation will work.

### Option A: Vercel

1. Go to [vercel.com](https://vercel.com), sign in with GitHub.
2. **Add New** → **Project** → import your repo.
3. Configure:
   - **Root Directory**: `frontend`
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. **Environment Variables**: Add `VITE_API_URL` = `https://your-backend-url/api`.
5. Deploy. You’ll get a URL like `https://quizapp-xxx.vercel.app`.

SPA routing is already handled by `frontend/vercel.json` (all routes → `index.html`).

### Option B: Netlify

1. Go to [netlify.com](https://netlify.com), sign in with GitHub.
2. **Add new site** → **Import an existing project** → choose repo.
3. Configure:
   - **Base directory**: `frontend`
   - **Build command**: `npm run build`
   - **Publish directory**: `frontend/dist`
4. **Environment variables**: Add `VITE_API_URL` = `https://your-backend-url/api`.
5. Deploy. SPA routing is handled by `frontend/public/_redirects` (all routes → `index.html`).

---

## Part 5: Wire frontend and backend

1. **Backend** `CLIENT_URL` must be the **exact** frontend URL (including `https://`).  
   - One origin: `https://your-app.vercel.app`  
   - Multiple: `https://your-app.vercel.app,https://www.yourdomain.com`
2. **Frontend** `VITE_API_URL` must be the backend API base, e.g. `https://quizapp-api.onrender.com/api` (no trailing slash is fine; the app uses it as base URL).

Then:

- API navigation: all frontend requests go to `VITE_API_URL`.
- CORS: backend allows the frontend origin from `CLIENT_URL`.
- SPA navigation: direct links and refresh work because Vercel/Netlify serve `index.html` for all routes.

---

## Part 6: Optional – custom domain and GitHub Pages

### Custom domain (Vercel/Netlify)

In the project settings, add your domain and follow the host’s DNS instructions. Then set backend `CLIENT_URL` to that domain (and add `www` if you use it, comma-separated).

### Deploy frontend on GitHub Pages (subpath)

If you host the app at `https://username.github.io/quizapp/`:

1. In `frontend/vite.config.mts` set `base: '/quizapp/'` (match repo name or folder).
2. In GitHub repo: **Settings** → **Pages** → Source **GitHub Actions** (or “Deploy from branch” and choose branch + `/ (root)` or `/docs` and set **Publish directory** to `frontend/dist` if using a branch).
3. For GitHub Actions, add a workflow that runs `cd frontend && npm ci && npm run build` and uploads `frontend/dist` to the `gh-pages` branch or to the Pages branch.
4. Set **VITE_API_URL** in the build (e.g. in the workflow or in repo Secrets and pass as env to the build).

Then:

- **CLIENT_URL** on the backend must be the full Pages URL, e.g. `https://username.github.io` (or with subpath if you use it in the browser).
- Router and 401 redirect already use `import.meta.env.BASE_URL`, so paths stay correct under a subpath.

---

## Part 7: Checklist

- [ ] Repo on GitHub, `.gitignore` in place (no `.env` or `node_modules` committed).
- [ ] Backend deployed; env vars set; `CLIENT_URL` = frontend URL.
- [ ] Frontend deployed; `VITE_API_URL` = backend API URL.
- [ ] Test: open frontend URL → login → use app; no CORS errors in browser console.
- [ ] Test: open `/admin`, `/student`, `/quiz/...` directly or refresh; SPA loads correctly.

If anything fails:

- **CORS**: Backend `CLIENT_URL` must exactly match the frontend origin (scheme + host + port).
- **404 on refresh**: Ensure SPA fallback is in place (`vercel.json` or `_redirects`).
- **API 401 redirect**: Uses `BASE_PATH`; for root deployment it stays `/login`; for subpath it uses `import.meta.env.BASE_URL` automatically.

You now have the project on GitHub and a live website with API and navigation configured for your host.
