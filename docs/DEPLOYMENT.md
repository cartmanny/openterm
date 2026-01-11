# OpenTerm Deployment Guide

This guide covers deploying OpenTerm to production using Vercel (frontend) and Railway (backend).

## Architecture Overview

```
                     ┌─────────────────────┐
                     │     User Browser    │
                     └──────────┬──────────┘
                                │
                     ┌──────────▼──────────┐
                     │   Vercel (CDN)      │
                     │   Next.js Frontend  │
                     └──────────┬──────────┘
                                │
                     ┌──────────▼──────────┐
                     │   Railway           │
                     │   FastAPI Backend   │
                     ├─────────────────────┤
                     │   PostgreSQL        │
                     │   Redis             │
                     └─────────────────────┘
```

## Prerequisites

- Node.js 18+ installed
- Python 3.11+ installed (for local testing)
- Git repository (GitHub recommended)
- Vercel account (free tier works)
- Railway account (free tier: $5/month credit)

## Quick Start

### 1. Install CLIs

```bash
npm i -g vercel @railway/cli
```

### 2. Run Setup Script

```bash
./scripts/setup-deployment.sh
```

This will:
- Verify prerequisites
- Install Vercel and Railway CLIs
- Log you into both services
- Link your projects

### 3. Deploy

```bash
# Deploy everything to production
./scripts/deploy-all.sh --prod

# Or deploy individually
./scripts/deploy-backend.sh
./scripts/deploy-frontend.sh --prod
```

## Manual Setup

### Backend (Railway)

1. **Create Railway Project**
   ```bash
   cd backend
   railway login
   railway init
   ```

2. **Add PostgreSQL**
   - In Railway dashboard, click "+ New" → "Database" → "PostgreSQL"
   - `DATABASE_URL` is auto-set

3. **Add Redis**
   - Click "+ New" → "Database" → "Redis"
   - `REDIS_URL` is auto-set

4. **Set Environment Variables**
   ```bash
   railway variables set FRONTEND_URL=https://your-app.vercel.app
   railway variables set FRED_API_KEY=your_key
   railway variables set FINNHUB_API_KEY=your_key
   railway variables set ALPHA_VANTAGE_KEY=your_key
   ```

5. **Deploy**
   ```bash
   railway up
   ```

### Frontend (Vercel)

1. **Login and Link**
   ```bash
   cd frontend
   vercel login
   vercel link
   ```

2. **Set Environment Variables**
   In Vercel dashboard or CLI:
   ```bash
   vercel env add NEXT_PUBLIC_API_URL production
   # Enter your Railway backend URL
   ```

3. **Deploy**
   ```bash
   vercel --prod
   ```

## Environment Variables

### Backend (Railway)

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes* | PostgreSQL connection (auto-set by Railway) |
| `REDIS_URL` | Yes* | Redis connection (auto-set by Railway) |
| `FRONTEND_URL` | Yes | Vercel frontend URL for CORS |
| `FRED_API_KEY` | No | FRED API key for macro data |
| `FINNHUB_API_KEY` | No | Finnhub key for news |
| `ALPHA_VANTAGE_KEY` | No | Alpha Vantage for real-time quotes |
| `SECRET_KEY` | No | JWT secret (auto-generated if not set) |

*Auto-set when using Railway's database plugins

### Frontend (Vercel)

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_API_URL` | Yes | Railway backend URL |

## GitHub Actions CI/CD

### Setup

1. **Add GitHub Secrets**
   - `VERCEL_TOKEN`: Get from Vercel → Settings → Tokens
   - `RAILWAY_TOKEN`: Get from Railway → Account → Tokens

2. **Workflows**
   - `ci.yml`: Runs tests on every PR
   - `deploy.yml`: Deploys to production on merge to main
   - `preview.yml`: Creates preview deployments for PRs

### Manual Trigger

You can manually trigger deployments:
```
GitHub → Actions → Deploy → Run workflow
```

## Configuration Files

### `frontend/vercel.json`
- Build configuration
- API rewrites to backend
- Security headers
- Region settings

### `backend/railway.toml`
- Dockerfile builder
- Health check path
- Start command with migrations
- Restart policy

### `backend/Dockerfile`
- Python 3.11 slim base
- Production dependencies
- Health check endpoint

## Health Checks

### Backend Health
```bash
curl https://your-railway-url.railway.app/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-10T12:00:00Z",
  "version": "0.1.0",
  "service": "OpenTerm"
}
```

### Frontend Health
Just verify the site loads at your Vercel URL.

## Monitoring

### Railway
- View logs: Railway dashboard → Deployments → Logs
- Metrics: Railway dashboard → Metrics tab
- Restart: Railway dashboard → Settings → Restart

### Vercel
- View logs: Vercel dashboard → Functions → Logs
- Analytics: Vercel dashboard → Analytics
- Deployments: Vercel dashboard → Deployments

## Troubleshooting

### Backend won't start

1. Check logs in Railway dashboard
2. Verify DATABASE_URL and REDIS_URL are set
3. Ensure migrations ran: check for "alembic upgrade head" in logs

### Frontend API calls fail

1. Verify NEXT_PUBLIC_API_URL is correct
2. Check CORS: FRONTEND_URL must match Vercel domain
3. Check Railway backend is running

### WebSocket not connecting

1. Ensure Railway URL uses `wss://` not `ws://`
2. Check CORS allows WebSocket origin
3. Verify `/ws/*` routes are accessible

### Database connection issues

1. Verify PostgreSQL is provisioned in Railway
2. Check DATABASE_URL is set correctly
3. Try restarting the service

## Scaling

### Railway
- Increase replicas: `railway.toml` → `numReplicas`
- Upgrade plan for more resources
- Add read replicas for PostgreSQL

### Vercel
- Edge functions for global distribution
- ISR for cached pages
- Upgrade plan for more bandwidth

## Security Checklist

- [ ] Set unique SECRET_KEY in production
- [ ] Enable HTTPS only (Railway/Vercel default)
- [ ] Set restrictive CORS origins
- [ ] Don't commit API keys to git
- [ ] Use GitHub secrets for CI/CD tokens
- [ ] Enable 2FA on Vercel and Railway accounts

## Costs

### Free Tier Limits

**Railway:**
- $5/month credit (covers small apps)
- 512MB RAM per service
- Shared CPU

**Vercel:**
- 100GB bandwidth/month
- Serverless functions included
- 6,000 build minutes/month

### Typical Production Costs
- Railway Pro: ~$20-40/month (dedicated resources)
- Vercel Pro: ~$20/month (more bandwidth, analytics)

## Support

- Railway docs: https://docs.railway.app
- Vercel docs: https://vercel.com/docs
- OpenTerm issues: https://github.com/your-repo/issues
