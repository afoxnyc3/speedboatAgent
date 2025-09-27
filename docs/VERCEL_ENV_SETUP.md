# Vercel Environment Variables Setup Guide

## Quick Setup Checklist

### Step 1: Create Vercel Project
```bash
# In project root directory
vercel

# When prompted:
# ? Set up and deploy? Y
# ? Which scope? [Select your account]
# ? Link to existing project? N
# ? What's your project name? speedboat-agent
# ? In which directory is your code? ./
# ? Want to modify settings? N
```

### Step 2: Access Environment Variables Section
1. Go to https://vercel.com/dashboard
2. Click on your `speedboat-agent` project
3. Click "Settings" tab
4. Click "Environment Variables" in left sidebar

### Step 3: Add Environment Variables

Copy and paste each of these into the Vercel dashboard:

#### Core AI Services
| Key | Value | Environment | Type |
|-----|-------|-------------|------|
| `OPENAI_API_KEY` | Your OpenAI API key starting with `sk-` | All | Encrypted |

#### Vector Database
| Key | Value | Environment | Type |
|-----|-------|-------------|------|
| `WEAVIATE_HOST` | Your Weaviate cluster URL (e.g., `https://your-cluster.weaviate.network`) | All | Plaintext |
| `WEAVIATE_API_KEY` | Your Weaviate API key | All | Encrypted |

#### GitHub Integration
| Key | Value | Environment | Type |
|-----|-------|-------------|------|
| `GITHUB_TOKEN` | GitHub Personal Access Token with repo access | Production | Encrypted |
| `GITHUB_WEBHOOK_SECRET` | Random secret for webhook validation (generate with `openssl rand -hex 32`) | Production | Encrypted |

#### Memory Service
| Key | Value | Environment | Type |
|-----|-------|-------------|------|
| `MEM0_API_KEY` | Your Mem0 API key | Production, Preview | Encrypted |

#### Web Crawling
| Key | Value | Environment | Type |
|-----|-------|-------------|------|
| `FIRECRAWL_API_KEY` | Your Firecrawl API key | Production, Preview | Encrypted |

#### Caching (Upstash Redis)
| Key | Value | Environment | Type |
|-----|-------|-------------|------|
| `UPSTASH_REDIS_URL` | Redis URL from Upstash console | All | Plaintext |
| `UPSTASH_REDIS_TOKEN` | Redis REST token from Upstash | All | Encrypted |

#### Monitoring (Optional but Recommended)
| Key | Value | Environment | Type |
|-----|-------|-------------|------|
| `SENTRY_DSN` | Your Sentry project DSN | Production | Plaintext |

#### Application URLs
| Key | Value | Environment | Type |
|-----|-------|-------------|------|
| `NEXT_PUBLIC_APP_URL` | See below for environment-specific values | Per Environment | Plaintext |

**Environment-specific values for NEXT_PUBLIC_APP_URL:**
- Production: `https://speedboat-agent.vercel.app` (or your custom domain)
- Preview: Leave blank (Vercel will use preview URL automatically)
- Development: `http://localhost:3000`

### Step 4: Add GitHub Actions Secrets

1. Go to your GitHub repository
2. Settings → Secrets and variables → Actions
3. Add these repository secrets:

| Secret Name | Where to Find It |
|-------------|------------------|
| `VERCEL_TOKEN` | Vercel Dashboard → Account Settings → Tokens → Create Token |
| `VERCEL_ORG_ID` | Vercel Dashboard → Project → Settings → General → Organization ID |
| `VERCEL_PROJECT_ID` | Vercel Dashboard → Project → Settings → General → Project ID |

### Step 5: Verify Environment Variables

After adding all variables, you should see approximately 11-12 environment variables in your Vercel dashboard.

To verify locally:
```bash
# Pull environment variables to local .env file
vercel env pull .env.local

# Check the file (don't commit it!)
cat .env.local
```

## Service Setup Guides

### Getting API Keys

#### OpenAI
1. Go to https://platform.openai.com/api-keys
2. Create new secret key
3. Copy immediately (won't be shown again)

#### Weaviate
1. Go to https://console.weaviate.cloud
2. Create or select your cluster
3. Go to Details → API Keys
4. Create new API key

#### GitHub Token
1. Go to https://github.com/settings/tokens
2. Generate new token (classic)
3. Select scopes: `repo`, `webhook`
4. Generate and copy token

#### Mem0
1. Sign up at https://mem0.ai
2. Go to Dashboard → API Keys
3. Create and copy API key

#### Firecrawl
1. Sign up at https://firecrawl.com
2. Go to Dashboard → API Keys
3. Generate and copy key

#### Upstash Redis
1. Go to https://console.upstash.com
2. Create Redis database
3. Go to Details tab
4. Copy REST URL and REST Token

#### Sentry
1. Go to https://sentry.io
2. Create new project (Next.js)
3. Go to Settings → Client Keys
4. Copy DSN

## Testing Your Setup

### 1. Test Local Environment
```bash
# Load environment variables
vercel env pull .env.local

# Run development server
npm run dev

# Test health endpoint
curl http://localhost:3000/api/health
```

### 2. Deploy to Preview
```bash
# Deploy to preview environment
vercel

# Test the preview URL provided
curl https://speedboat-agent-xxxxx.vercel.app/api/health
```

### 3. Deploy to Production
```bash
# Deploy to production
vercel --prod

# Test production
curl https://speedboat-agent.vercel.app/api/health
```

## Troubleshooting

### Common Issues

#### "Environment variable X is not defined"
- Check spelling in Vercel dashboard
- Ensure variable is set for correct environment
- Try `vercel env pull` to refresh local env

#### "401 Unauthorized" errors
- Verify API keys are correct
- Check if keys have required permissions
- Ensure keys haven't expired

#### "Failed to connect to Redis"
- Check Upstash Redis URL format
- Verify token is the REST token, not standard Redis password
- Check if Redis instance is active

#### Build failures
- Check build logs in Vercel dashboard
- Ensure all required env vars are set
- Try building locally first: `npm run build`

## Security Best Practices

1. **Never commit .env files** - They should be in .gitignore
2. **Use different API keys** for production vs development when possible
3. **Rotate keys regularly** - Set reminders every 90 days
4. **Limit token scopes** - Only grant necessary permissions
5. **Use Preview deployments** to test before production

## Next Steps

After setting up environment variables:

1. **Test deployment**: Run `vercel` to create preview deployment
2. **Verify all endpoints**: Check /api/health shows all services connected
3. **Configure GitHub webhook**: Use production URL + `/api/ingest/github`
4. **Monitor initial deployment**: Watch Vercel Functions logs for errors
5. **Set up custom domain** (optional): In Vercel project settings

---

**Need Help?**
- Vercel Docs: https://vercel.com/docs/environment-variables
- Project Issues: https://github.com/afoxnyc3/speedboatAgent/issues