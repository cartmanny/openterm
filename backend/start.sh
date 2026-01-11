#!/bin/bash

echo "=================================="
echo "OpenTerm Startup Script"
echo "=================================="
echo "PORT: ${PORT:-8000}"
echo "DATABASE_URL configured: ${DATABASE_URL:+yes}"
echo "REDIS_URL configured: ${REDIS_URL:+yes}"
echo "=================================="

# Skip alembic for now - database might not be ready
# alembic upgrade head || echo "Migrations skipped"

# Start the application
echo "Starting uvicorn on port ${PORT:-8000}..."
exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}"
