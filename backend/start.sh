#!/bin/bash
set -e

echo "=================================="
echo "OpenTerm Startup Script"
echo "=================================="
echo "PORT: ${PORT:-not set}"
echo "DATABASE_URL: ${DATABASE_URL:+configured}"
echo "REDIS_URL: ${REDIS_URL:+configured}"
echo "FRED_API_KEY: ${FRED_API_KEY:+configured}"
echo "FINNHUB_API_KEY: ${FINNHUB_API_KEY:+configured}"
echo "=================================="

# Run database migrations (continue even if it fails for now)
echo "Running database migrations..."
if alembic upgrade head; then
    echo "Migrations completed successfully"
else
    echo "WARNING: Migrations failed, but continuing startup..."
    echo "The app may have limited functionality without database access."
fi

# Start the application
echo "Starting uvicorn on port ${PORT:-8000}..."
exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}"
