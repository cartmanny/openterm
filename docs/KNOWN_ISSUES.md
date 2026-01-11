# Known Issues and Limitations

## Data Source Limitations

### Stooq
- **No documented rate limits**: Conservative 60 req/min assumed
- **EOD data only**: No intraday quotes available
- **Volume may be missing**: Some securities lack volume data
- **No fundamentals**: Price data only

### Yahoo Finance
- **Unstable API**: Changes without notice, may break
- **Aggressive rate limiting**: ~100 requests/hour safe
- **Terms of service**: Prohibits scraping, use for personal/educational only
- **Crumb mechanism**: May require cookies for some endpoints

### SEC EDGAR
- **Official source**: Reliable but can be slow
- **No real-time alerts**: Must poll for new filings
- **Large filings**: Some 10-Ks are very large HTML files

## Feature Limitations

### Not Implemented (MVP)

| Feature | Status | Notes |
|---------|--------|-------|
| Screener | API stub only | Full implementation in v1.0 |
| Portfolio analytics | Not started | Planned for v1.0 |
| Macro data (FRED) | Models only | Integration pending |
| News aggregation | Not started | v1.0 feature |
| Alerts | Not started | v2.0 feature |
| Options chains | Not planned | Limited free data |

### Partial Implementation

| Feature | What Works | What's Missing |
|---------|------------|----------------|
| Command parser | Basic commands | SCREEN, MACRO, PORT |
| Keyboard navigation | Command bar | Panel navigation |
| Caching | Backend Redis | Frontend caching |
| Error handling | Basic | Comprehensive boundaries |

## Technical Debt

1. **No frontend tests**: React component tests not implemented
2. **Limited type safety**: Some `any` types in frontend
3. **No request retry in frontend**: Only backend has retry logic
4. **No websocket support**: All polling-based
5. **No service worker**: Offline mode not supported

## Security Notes

### MVP (Acceptable for local use)
- No authentication
- No HTTPS (local only)
- API keys in environment variables
- No audit logging

### Required for Production
- [ ] Add JWT authentication
- [ ] HTTPS everywhere
- [ ] Secrets management (Vault, etc.)
- [ ] Rate limiting per user
- [ ] Audit logging
- [ ] CORS restrictions

## Browser Compatibility

Tested on:
- Chrome 120+
- Firefox 120+
- Safari 17+

Not tested:
- Edge
- Mobile browsers

## Performance Notes

- **Initial load**: ~2-3s (includes chart library)
- **Search autocomplete**: ~150-300ms (with cache)
- **Price chart**: ~500ms-1s (depends on source)
- **Fundamentals**: ~500ms-1s (depends on source)

## Next Steps

1. **Add integration tests**: End-to-end flow testing
2. **Implement screener**: Server-side filtering
3. **Add FRED integration**: Macro economic data
4. **Improve error UX**: Better error messages in UI
5. **Add loading states**: Skeleton loaders
6. **Performance optimization**: Virtual scrolling for large lists
