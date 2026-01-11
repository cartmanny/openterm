# OpenTerm Quick Deploy Guide

Get OpenTerm running in production in 10 minutes.

## Prerequisites

- GitHub account with your OpenTerm fork
- Vercel account (sign up at vercel.com)
- Railway account (sign up at railway.app)

## Step 1: Deploy Backend (Railway)

1. Go to [railway.app](https://railway.app) and sign in
2. Click **"New Project"** → **"Deploy from GitHub Repo"**
3. Select your OpenTerm repository
4. Set **Root Directory** to `backend`
5. Click **"Add Variables"** and set:
   ```
   FRONTEND_URL = (leave empty for now, set after Vercel deploy)
   ```
6. Click **"+ New"** → **"Database"** → **"PostgreSQL"**
7. Click **"+ New"** → **"Database"** → **"Redis"**
8. Wait for deployment (2-3 minutes)
9. Copy your Railway URL (e.g., `https://openterm-backend-xxx.railway.app`)

## Step 2: Deploy Frontend (Vercel)

1. Go to [vercel.com](https://vercel.com) and sign in
2. Click **"Add New..."** → **"Project"**
3. Import your OpenTerm repository
4. Set **Root Directory** to `frontend`
5. Add **Environment Variable**:
   ```
   NEXT_PUBLIC_API_URL = https://your-railway-url.railway.app
   ```
6. Click **"Deploy"**
7. Wait for deployment (1-2 minutes)
8. Copy your Vercel URL (e.g., `https://openterm-xxx.vercel.app`)

## Step 3: Connect Them

1. Go back to Railway dashboard
2. Click on your backend service
3. Go to **Variables** tab
4. Set `FRONTEND_URL` to your Vercel URL
5. Railway will auto-redeploy

## Step 4: Verify

1. Open your Vercel URL in a browser
2. You should see the OpenTerm terminal
3. Try a command: `AAPL` or `GP AAPL`

## Done!

Your OpenTerm instance is now live.

---

## Optional: Add API Keys

For enhanced functionality, add these in Railway variables:

```bash
FRED_API_KEY=xxx        # Free: fred.stlouisfed.org
FINNHUB_API_KEY=xxx     # Free: finnhub.io
ALPHA_VANTAGE_KEY=xxx   # Free: alphavantage.co
```

## Optional: Custom Domain

### Vercel
1. Go to project settings → Domains
2. Add your domain
3. Update DNS as instructed

### Railway
1. Go to service settings → Domains
2. Add custom domain
3. Update DNS as instructed

---

## Troubleshooting

**"Failed to fetch" errors:**
- Check NEXT_PUBLIC_API_URL is set correctly in Vercel
- Check FRONTEND_URL is set correctly in Railway

**Backend not starting:**
- Ensure PostgreSQL and Redis are added in Railway
- Check deployment logs for errors

**Need help?**
- Full guide: [docs/DEPLOYMENT.md](./DEPLOYMENT.md)
- Issues: GitHub Issues
