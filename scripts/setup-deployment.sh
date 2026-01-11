#!/bin/bash

# OpenTerm Deployment Setup Script
# Helps configure Vercel and Railway for first-time deployment

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

echo "=========================================="
echo "  OpenTerm Deployment Setup"
echo "=========================================="
echo ""

# Check prerequisites
echo "Checking prerequisites..."
echo ""

# Node.js
if command -v node &> /dev/null; then
    echo "  [OK] Node.js $(node --version)"
else
    echo "  [X] Node.js not found. Please install Node.js 18+"
    exit 1
fi

# npm
if command -v npm &> /dev/null; then
    echo "  [OK] npm $(npm --version)"
else
    echo "  [X] npm not found"
    exit 1
fi

# Vercel CLI
if command -v vercel &> /dev/null; then
    echo "  [OK] Vercel CLI installed"
else
    echo "  [ ] Installing Vercel CLI..."
    npm i -g vercel
    echo "  [OK] Vercel CLI installed"
fi

# Railway CLI
if command -v railway &> /dev/null; then
    echo "  [OK] Railway CLI installed"
else
    echo "  [ ] Installing Railway CLI..."
    npm i -g @railway/cli
    echo "  [OK] Railway CLI installed"
fi

echo ""
echo "-------------------------------------------"
echo "Setting up Vercel (Frontend)"
echo "-------------------------------------------"
echo ""

cd "$ROOT_DIR/frontend"

# Check Vercel login
if vercel whoami &> /dev/null; then
    echo "Already logged in to Vercel as: $(vercel whoami)"
else
    echo "Please login to Vercel:"
    vercel login
fi

# Link project
if [ ! -d ".vercel" ]; then
    echo ""
    echo "Linking Vercel project..."
    vercel link
fi

echo ""
echo "-------------------------------------------"
echo "Setting up Railway (Backend)"
echo "-------------------------------------------"
echo ""

cd "$ROOT_DIR/backend"

# Check Railway login
if railway whoami &> /dev/null; then
    echo "Already logged in to Railway as: $(railway whoami)"
else
    echo "Please login to Railway:"
    railway login
fi

# Link project
if [ ! -f ".railway/config.json" ]; then
    echo ""
    echo "Linking Railway project..."
    railway link
fi

echo ""
echo "-------------------------------------------"
echo "Environment Variables Checklist"
echo "-------------------------------------------"
echo ""
echo "Railway (Backend) - Set these in Railway dashboard:"
echo "  - DATABASE_URL        (auto-set if using Railway PostgreSQL)"
echo "  - REDIS_URL           (auto-set if using Railway Redis)"
echo "  - FRONTEND_URL        (your Vercel production URL)"
echo "  - FRED_API_KEY        (optional, for macro data)"
echo "  - FINNHUB_API_KEY     (optional, for news)"
echo "  - ALPHA_VANTAGE_KEY   (optional, for real-time quotes)"
echo ""
echo "Vercel (Frontend) - Set these in Vercel dashboard:"
echo "  - NEXT_PUBLIC_API_URL (your Railway production URL)"
echo ""
echo "-------------------------------------------"
echo "Setup Complete!"
echo "-------------------------------------------"
echo ""
echo "Next steps:"
echo "  1. Set environment variables in Vercel and Railway dashboards"
echo "  2. Add PostgreSQL and Redis plugins in Railway"
echo "  3. Run: ./scripts/deploy-all.sh --prod"
echo ""
