# RAG Agent Setup Guide

Complete setup guide for getting the RAG agent running in any environment - from demo mode to full production.

## 🚀 Quick Start Options

### Option 1: Demo Mode (0 minutes)
Works immediately without any API keys - perfect for testing and evaluation.

```bash
git clone https://github.com/afoxnyc3/speedboatAgent.git
cd speedboatAgent
npm install
npm run dev
```

**What you get**: Full UI with realistic demo responses, no external dependencies.

### Option 2: Partial Setup (15 minutes)
Basic functionality with some external services.

```bash
# Create .env.local with minimal config
DEMO_MODE=false
OPENAI_API_KEY=your_key_here  # Optional: get from OpenAI
```

**What you get**: Real AI responses OR graceful fallback to demo mode.

### Option 3: Full Production (60 minutes)
Complete setup with all features enabled.

**What you get**: Full RAG capabilities, vector search, memory, caching, monitoring.

---

## 🔑 API Keys & Service Setup

### Required Services by Priority

#### 1. OpenAI (Highest Priority)
**Impact**: Without this, system automatically uses demo mode.

**Get your key**:
1. Go to [platform.openai.com](https://platform.openai.com/api-keys)
2. Click "Create new secret key"
3. Copy the key (starts with `sk-`)
4. Add to `.env.local`:
   ```env
   OPENAI_API_KEY=sk-your-key-here
   ```

**Cost**: ~$0.01-0.10 per chat interaction

**Health check**:
```bash
curl -H "Authorization: Bearer $OPENAI_API_KEY" https://api.openai.com/v1/models
```

#### 2. Weaviate (High Priority)
**Impact**: Without this, system uses fallback search responses.

**Get your instance**:
1. Go to [console.weaviate.cloud](https://console.weaviate.cloud)
2. Create free cluster (14-day trial, then paid)
3. Copy cluster URL and API key
4. Add to `.env.local`:
   ```env
   WEAVIATE_HOST=https://your-cluster.weaviate.cloud
   WEAVIATE_API_KEY=your-api-key-here
   ```

**Cost**: Free for 14 days, then ~$25/month for basic usage

**Health check**:
```bash
curl -H "Authorization: Bearer $WEAVIATE_API_KEY" $WEAVIATE_HOST/v1/meta
```

#### 3. Upstash Redis (Medium Priority)
**Impact**: Without this, responses may be slower (no caching).

**Get your instance**:
1. Go to [console.upstash.com](https://console.upstash.com)
2. Create Redis database (free tier available)
3. Copy URL and token from dashboard
4. Add to `.env.local`:
   ```env
   UPSTASH_REDIS_URL=https://your-db.upstash.io
   UPSTASH_REDIS_TOKEN=your-token-here
   ```

**Cost**: Free tier: 10K commands/day

#### 4. Mem0 (Optional)
**Impact**: Without this, no conversation memory (each chat is isolated).

**Get your key**:
1. Go to [mem0.ai](https://mem0.ai)
2. Sign up and get API key
3. Add to `.env.local`:
   ```env
   MEM0_API_KEY=your-key-here
   ```

**Cost**: Free tier available

---

## ⚡ Environment Configuration

### Complete .env.local Template

```env
# ===========================================
# RAG AGENT CONFIGURATION
# ===========================================

# Development Settings
NODE_ENV=development
NEXT_PUBLIC_APP_ENV=development

# ===========================================
# CORE AI SERVICES
# ===========================================

# OpenAI API (REQUIRED for AI responses)
# Get from: https://platform.openai.com/api-keys
# Cost: ~$0.01-0.10 per interaction
OPENAI_API_KEY=sk-your-key-here

# ===========================================
# VECTOR DATABASE
# ===========================================

# Weaviate (REQUIRED for search)
# Get from: https://console.weaviate.cloud
# Cost: Free 14 days, then ~$25/month
WEAVIATE_HOST=https://your-cluster.weaviate.cloud
WEAVIATE_API_KEY=your-api-key-here

# ===========================================
# PERFORMANCE & CACHING
# ===========================================

# Upstash Redis (OPTIONAL - improves performance)
# Get from: https://console.upstash.com
# Cost: Free tier 10K commands/day
UPSTASH_REDIS_URL=https://your-db.upstash.io
UPSTASH_REDIS_TOKEN=your-token-here

# ===========================================
# CONVERSATION MEMORY
# ===========================================

# Mem0 (OPTIONAL - adds conversation context)
# Get from: https://mem0.ai
# Cost: Free tier available
MEM0_API_KEY=your-key-here

# ===========================================
# GITHUB INTEGRATION (OPTIONAL)
# ===========================================

# GitHub (OPTIONAL - for repository ingestion)
# Get from: https://github.com/settings/tokens
# Scope: repo (for private repos) or public_repo
GITHUB_TOKEN=ghp_your-token-here
GITHUB_WEBHOOK_SECRET=your-webhook-secret

# ===========================================
# WEB CRAWLING (OPTIONAL)
# ===========================================

# Firecrawl (OPTIONAL - for web documentation)
# Get from: https://firecrawl.dev
FIRECRAWL_API_KEY=fc-your-key-here

# ===========================================
# MONITORING & DEBUGGING
# ===========================================

# Sentry (OPTIONAL - error tracking)
# Get from: https://sentry.io
SENTRY_DSN=https://your-dsn@sentry.io/project-id

# Vercel Analytics (OPTIONAL)
VERCEL_ENV=development

# ===========================================
# FALLBACK & DEMO MODES
# ===========================================

# Force demo mode (ignores all API keys)
# DEMO_MODE=true

# Local repository for testing
# LOCAL_REPO_PATH=/path/to/your/repo
```

---

## 🔧 Setup Verification

### 1. Check Health Status
```bash
# Start the app
npm run dev

# Check health endpoint (new window/tab)
curl http://localhost:3000/api/health
```

**Expected responses**:

**✅ All services healthy**:
```json
{
  "status": "healthy",
  "fallbackMode": false,
  "checks": {
    "openai": { "healthy": true, "responseTime": 245 },
    "weaviate": { "healthy": true, "responseTime": 189 },
    "redis": { "healthy": true, "responseTime": 112 }
  },
  "recommendations": ["All services healthy - optimal performance expected"]
}
```

**⚠️ Partial setup**:
```json
{
  "status": "degraded",
  "fallbackMode": true,
  "recommendations": [
    "System running in fallback mode - limited functionality",
    "OpenAI API key not configured - demo mode only"
  ]
}
```

**❌ Demo mode**:
```json
{
  "status": "degraded",
  "fallbackMode": true,
  "recommendations": [
    "System running in fallback mode - limited functionality",
    "OpenAI API key not configured - demo mode only",
    "Weaviate not configured - search functionality unavailable"
  ]
}
```

### 2. Test Chat Interface

**Demo Mode Test**:
1. Go to http://localhost:3000
2. Ask: "What locations are open now?"
3. Should get realistic demo response with mock sources

**AI Mode Test**:
1. Go to http://localhost:3000
2. Ask: "Explain how this RAG system works"
3. Should get AI-generated response (longer delay)

### 3. Verify Streaming

Watch the browser network tab while sending a message:
- ✅ Should see `/api/chat/stream` requests
- ✅ Should see progressive status updates: "Searching" → "Analyzing" → "Generating"
- ✅ Text should appear word-by-word

---

## 🔥 Troubleshooting

### Common Issues & Solutions

#### "OpenAI quota exceeded"
**Symptoms**: Error messages, automatic demo mode activation
**Solutions**:
1. Check your OpenAI usage: [platform.openai.com/usage](https://platform.openai.com/usage)
2. Add billing method if needed
3. System automatically falls back to demo mode

#### "Chat not returning RAG data"
**Symptoms**: Generic responses, no source citations
**Solutions**:
1. Check health endpoint: `curl http://localhost:3000/api/health`
2. Verify Weaviate configuration
3. If Weaviate is down, system uses fallback responses

#### "Infinite page reloads"
**Symptoms**: Page refreshes after starting to generate response
**Solutions**:
1. Check browser console for errors
2. Verify all environment variables are set
3. This was a bug - should be fixed in current version

#### "No conversation memory"
**Symptoms**: Bot doesn't remember previous messages
**Solutions**:
1. Verify `MEM0_API_KEY` is set
2. This is optional - system works without it

#### "Slow responses"
**Symptoms**: Responses take >10 seconds
**Solutions**:
1. Enable Redis caching with `UPSTASH_REDIS_URL`
2. Check network connection
3. OpenAI API can be slow during peak times

### System Behavior by Configuration

| Services Available | Mode | Capabilities |
|-------------------|------|-------------|
| None | Demo | Realistic responses, mock sources, no external calls |
| OpenAI only | AI Fallback | Real AI responses, fallback search results |
| OpenAI + Weaviate | Basic RAG | Real AI + vector search, no memory/caching |
| All services | Full RAG | Complete functionality, optimal performance |

### Getting Help

1. **Check health endpoint**: `curl http://localhost:3000/api/health`
2. **Check logs**: Look at terminal running `npm run dev`
3. **Browser console**: Open DevTools → Console for frontend errors
4. **Test individual services**: Use the health check curl commands above

---

## 🚦 API Key Priority Guide

**Start here if you're new**:

1. **Just exploring?** → No setup needed, demo mode works immediately
2. **Want to test AI?** → Get OpenAI key only (~$5 credit)
3. **Building for production?** → Get OpenAI + Weaviate (~$30/month)
4. **Need optimal performance?** → Add Redis + Mem0 (~$35/month total)

**Cost summary**:
- Demo mode: $0
- Basic AI: ~$5 one-time (OpenAI credits)
- Production: ~$30-35/month
- Enterprise: Add monitoring/analytics services

---

## 🎯 Next Steps

Once you have the system running:

1. **Test the interface** - Try different types of questions
2. **Monitor performance** - Check the health endpoint regularly
3. **Review logs** - Watch for any errors or warnings
4. **Scale up** - Add missing services based on your needs
5. **Customize** - Modify prompts, add data sources, adjust settings

### Production Deployment

When ready for production:

1. **Secure your keys** - Use proper environment variable management
2. **Enable monitoring** - Add Sentry for error tracking
3. **Set up alerts** - Monitor the health endpoint
4. **Configure rate limiting** - Built-in protection at 100 req/min
5. **Deploy** - Push to Vercel or your preferred platform

---

**Questions?** Check the [main README](./README.md) or create an issue on GitHub.