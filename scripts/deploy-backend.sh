#!/bin/bash
set -e

# OpenTerm Backend Deployment Script
# Deploys the FastAPI backend to Railway

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
BACKEND_DIR="$ROOT_DIR/backend"

echo "=========================================="
echo "  OpenTerm Backend Deployment (Railway)"
echo "=========================================="

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "Error: Railway CLI is not installed."
    echo "Install it with: npm i -g @railway/cli"
    exit 1
fi

cd "$BACKEND_DIR"

echo ""
echo "Directory: $BACKEND_DIR"
echo ""

# Check Railway login status
echo "Checking Railway authentication..."
if ! railway whoami &> /dev/null; then
    echo "Not logged in. Running railway login..."
    railway login
fi

# Link to project if not linked
if [ ! -f ".railway/config.json" ]; then
    echo ""
    echo "No Railway project linked. Please select or create a project:"
    railway link
fi

echo ""
echo "Deploying to Railway..."
railway up

echo ""
echo "Backend deployment complete!"
echo ""

# Show deployment URL
echo "Fetching deployment info..."
railway status
