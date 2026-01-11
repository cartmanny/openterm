#!/bin/bash
set -e

# OpenTerm Full Deployment Script
# Deploys both frontend (Vercel) and backend (Railway)

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "=========================================="
echo "  OpenTerm Full Stack Deployment"
echo "=========================================="
echo ""

# Parse arguments
PRODUCTION=false
FRONTEND_ONLY=false
BACKEND_ONLY=false

while [[ "$#" -gt 0 ]]; do
    case $1 in
        --prod|--production) PRODUCTION=true ;;
        --frontend-only) FRONTEND_ONLY=true ;;
        --backend-only) BACKEND_ONLY=true ;;
        -h|--help)
            echo "Usage: $0 [options]"
            echo ""
            echo "Options:"
            echo "  --prod, --production  Deploy to production (default: preview)"
            echo "  --frontend-only       Only deploy frontend"
            echo "  --backend-only        Only deploy backend"
            echo "  -h, --help            Show this help message"
            exit 0
            ;;
        *) echo "Unknown parameter: $1"; exit 1 ;;
    esac
    shift
done

# Deploy backend first (API needs to be up before frontend)
if [ "$FRONTEND_ONLY" = false ]; then
    echo ""
    echo "Step 1/2: Deploying Backend..."
    echo "-------------------------------------------"
    "$SCRIPT_DIR/deploy-backend.sh"
fi

# Deploy frontend
if [ "$BACKEND_ONLY" = false ]; then
    echo ""
    echo "Step 2/2: Deploying Frontend..."
    echo "-------------------------------------------"
    if [ "$PRODUCTION" = true ]; then
        "$SCRIPT_DIR/deploy-frontend.sh" --prod
    else
        "$SCRIPT_DIR/deploy-frontend.sh"
    fi
fi

echo ""
echo "=========================================="
echo "  Deployment Complete!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "  1. Verify backend health: curl <railway-url>/health"
echo "  2. Verify frontend: open <vercel-url>"
echo "  3. Set environment variables if not already done"
echo ""
