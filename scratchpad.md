# Development Scratchpad

*Updated on 2025-09-26 for Issue #27: Rate limiting and API security*

## Planning for Issue #27: Rate Limiting and API Security
Date: 2025-09-26

### Understanding
- **Problem**: Production API endpoints need rate limiting and security hardening
- **Users**: External users and internal services accessing RAG API endpoints
- **Constraints**: Must maintain performance while preventing abuse, <100 line files

### Requirements from Roadmap
- **Rate Limiting**: 100 req/min per IP
- **API Key Rotation**: Implement API key rotation mechanism
- **Throttling Logic**: Smart throttling with backoff

### Approach
- **Rate Limiting Middleware**: Next.js middleware for all API routes
- **Redis-based Storage**: Use existing Upstash Redis for rate limit tracking
- **Security Headers**: CORS, CSP, and security headers
- **Input Sanitization**: Zod schema validation enhancement
- **API Key Management**: Rotation system with multiple valid keys

### Implementation Steps
1. **Rate Limiting Middleware** - IP-based rate limiting with Redis
2. **Security Headers** - CORS, CSP, security middleware
3. **Input Sanitization** - Enhanced Zod validation
4. **API Key Rotation** - Key management system
5. **Security Testing** - Rate limit and security tests
6. **Documentation** - Security configuration guide

### Technical Decisions
- **Storage**: Upstash Redis (already configured) for rate limit counters
- **Middleware**: Next.js middleware.ts for global application
- **Rate Limiting**: Sliding window counter with Redis
- **Security**: Industry standard headers (OWASP guidelines)
- **API Keys**: Environment-based rotation with multiple valid keys

### Dependencies
Already available:
- @upstash/redis: Rate limit storage
- zod: Input validation
- next: Middleware support

### Rate Limiting Strategy
- **Window**: Sliding window (60 seconds)
- **Limit**: 100 requests per IP per minute
- **Storage**: Redis hash with IP as key, timestamp arrays as values
- **Cleanup**: TTL-based expiration
- **Response**: HTTP 429 with Retry-After header

### Security Headers
- **CORS**: Restrict origins in production
- **CSP**: Content Security Policy
- **HSTS**: HTTP Strict Transport Security
- **X-Frame-Options**: Clickjacking protection
- **X-Content-Type-Options**: MIME sniffing protection

### Files to Create
- `/middleware.ts` (Next.js middleware for rate limiting + security)
- `/src/lib/security/rate-limiter.ts` (Redis-based rate limiting)
- `/src/lib/security/api-keys.ts` (API key rotation system)
- `/src/lib/security/__tests__/rate-limiter.test.ts`
- `/src/lib/security/__tests__/api-keys.test.ts`

### Integration Points
- Apply to all `/api/*` routes
- Integrate with existing Redis cache
- Add rate limit metrics to monitoring dashboard
- Update environment configuration