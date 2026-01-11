# OpenTerm Quality Gates

---

## 1. Test Coverage Requirements

### Unit Tests (Required)

| Component | File | Coverage |
|-----------|------|----------|
| Stooq CSV parser | `tests/unit/test_parser.py` | `StooqAdapter._parse_csv` |
| Rate limiter | `tests/unit/test_parser.py` | `TokenBucket`, `RateLimiter` |
| Circuit breaker | `tests/unit/test_parser.py` | `CircuitBreaker` |
| Command parser (FE) | `src/lib/commands/parser.ts` | All command types |

### Contract Tests (Required)

| Source | File | Validates |
|--------|------|-----------|
| Stooq | `tests/contract/test_adapters.py` | CSV format, bar fields |
| SEC EDGAR | `tests/contract/test_adapters.py` | JSON structure, filing fields |
| Yahoo Finance | `tests/contract/test_adapters.py` | Fundamentals fields |

### Integration Tests (Required for v1.0)

| Flow | Description |
|------|-------------|
| Instrument search | Search → DB → Cache → Response |
| Price fetch | API → Adapter → DB → Cache → Response |
| Watchlist CRUD | Create → Add → Remove → Delete |

---

## 2. Linting Configuration

### Backend (Python)

**Ruff Configuration:**
```toml
[tool.ruff]
target-version = "py311"
line-length = 100

[tool.ruff.lint]
select = ["E", "F", "I", "N", "W", "UP"]
ignore = ["E501"]
```

**Run:**
```bash
ruff check .
ruff format .
```

### Frontend (TypeScript)

**ESLint Configuration:** `next lint` (default Next.js)

**Run:**
```bash
npm run lint
```

---

## 3. Type Checking

### Backend

**MyPy Configuration:**
```toml
[tool.mypy]
python_version = "3.11"
strict = true
```

**Run:**
```bash
mypy app/
```

### Frontend

**TypeScript:** Strict mode enabled in `tsconfig.json`

**Run:**
```bash
npx tsc --noEmit
```

---

## 4. Pre-Commit Checks (Recommended)

```yaml
# .pre-commit-config.yaml
repos:
  - repo: https://github.com/astral-sh/ruff-pre-commit
    rev: v0.1.11
    hooks:
      - id: ruff
        args: [--fix]
      - id: ruff-format

  - repo: https://github.com/pre-commit/mirrors-mypy
    rev: v1.8.0
    hooks:
      - id: mypy
        additional_dependencies: [types-redis]
```

---

## 5. TODO List: Known Limitations

### Data Sources

- [ ] **Stooq rate limits unknown**: Conservative 60 req/min assumed
- [ ] **Yahoo Finance unstable**: May break without notice, needs monitoring
- [ ] **No real-time quotes**: All prices are EOD or 15-min delayed
- [ ] **International coverage limited**: Focus on US equities

### Features Not Implemented

- [ ] **Screener**: API stub exists, full implementation in v1.0
- [ ] **Portfolio analytics**: Backend stub, frontend pending
- [ ] **Macro data (FRED)**: Integration pending
- [ ] **News aggregation**: Not in MVP
- [ ] **Alerts**: v2.0 feature

### Technical Debt

- [ ] **Error boundaries in React**: Need comprehensive error handling
- [ ] **API response caching**: Frontend caching not implemented
- [ ] **Keyboard navigation**: Partial implementation
- [ ] **Accessibility**: Not audited

---

## 6. Security Considerations

### MVP (Acceptable)

- No authentication (single-user local deployment)
- No PII stored
- All data read-only from external sources

### v1.0 (Required)

- [ ] Add JWT authentication
- [ ] Implement rate limiting per user
- [ ] Add API key management
- [ ] Audit secrets handling

---

## 7. Performance Targets

| Operation | Target | Measured |
|-----------|--------|----------|
| Search autocomplete | < 200ms | TBD |
| Price chart load | < 1s | TBD |
| Fundamentals load | < 1s | TBD |
| Command parse | < 50ms | TBD |

---

## 8. Deployment Checklist

### Local Development

- [ ] `docker compose up` starts all services
- [ ] Migrations run successfully
- [ ] Frontend accessible at http://localhost:3000
- [ ] API accessible at http://localhost:8000
- [ ] Health check passes: `GET /api/v1/health`

### Before v1.0 Release

- [ ] All unit tests pass
- [ ] All contract tests pass
- [ ] Linting passes
- [ ] Type checking passes
- [ ] Security audit complete
- [ ] Performance benchmarks meet targets
- [ ] Documentation complete
- [ ] Known issues documented

---

## 9. Monitoring (v1.0+)

### Metrics to Track

- API response times (p50, p95, p99)
- Source adapter error rates
- Cache hit rates
- Rate limit utilization

### Alerts to Configure

- Source adapter failures > 5/min
- API error rate > 1%
- Response time p95 > 2s
