.PHONY: dev build up down logs test lint migrate seed clean

# Development
dev:
	docker compose up

build:
	docker compose build

up:
	docker compose up -d

down:
	docker compose down

logs:
	docker compose logs -f

# Backend
backend-shell:
	docker compose exec backend bash

migrate:
	docker compose exec backend alembic upgrade head

migrate-down:
	docker compose exec backend alembic downgrade -1

seed:
	docker compose exec backend python -m scripts.seed_data

# Testing
test:
	docker compose exec backend pytest

test-cov:
	docker compose exec backend pytest --cov=app --cov-report=html

# Linting
lint:
	docker compose exec backend ruff check .
	cd frontend && npm run lint

format:
	docker compose exec backend ruff format .

# Cleanup
clean:
	docker compose down -v
	rm -rf frontend/.next
	rm -rf backend/__pycache__
	find . -type d -name __pycache__ -exec rm -rf {} +

# Health check
health:
	curl -s http://localhost:8000/api/v1/health | jq

# Database
psql:
	docker compose exec postgres psql -U openterm -d openterm

# Quick start
init: build up migrate
	@echo "OpenTerm is running at http://localhost:3000"
