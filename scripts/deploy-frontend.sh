#!/bin/bash
set -e

# OpenTerm Frontend Deployment Script
# Deploys the Next.js frontend to Vercel

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
FRONTEND_DIR="$ROOT_DIR/frontend"

echo "=========================================="
echo "  OpenTerm Frontend Deployment (Vercel)"
echo "=========================================="

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "Error: Vercel CLI is not installed."
    echo "Install it with: npm i -g vercel"
    exit 1
fi

cd "$FRONTEND_DIR"

# Parse arguments
PRODUCTION=false
while [[ "$#" -gt 0 ]]; do
    case $1 in
        --prod|--production) PRODUCTION=true ;;
        *) echo "Unknown parameter: $1"; exit 1 ;;
    esac
    shift
done

echo ""
echo "Directory: $FRONTEND_DIR"
echo "Production: $PRODUCTION"
echo ""

# Build check
echo "Running build check..."
npm run build

if [ "$PRODUCTION" = true ]; then
    echo ""
    echo "Deploying to PRODUCTION..."
    vercel --prod
else
    echo ""
    echo "Deploying to PREVIEW..."
    vercel
fi

echo ""
echo "Frontend deployment complete!"
echo ""
