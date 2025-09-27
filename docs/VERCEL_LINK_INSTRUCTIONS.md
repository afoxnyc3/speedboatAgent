# Linking to Existing Vercel Project

## Current Situation
✅ **Good News**: Your Vercel deployment at `speedboat-agent.vercel.app` is fully functional with all environment variables already configured!

## Required Manual Steps

### Step 1: Login to Vercel CLI
Open your terminal and run:
```bash
vercel login
```

Choose your preferred login method:
- **GitHub** (recommended if you used GitHub to create the Vercel account)
- **GitLab**
- **Bitbucket**
- **Email**

### Step 2: Link to Existing Project
After logging in, run this from the project root:
```bash
vercel link
```

When prompted, respond as follows:
```
? Set up "~/bootcamp/speedboatAgent"? [Y/n] → Y
? Which scope should contain your project? → [Select your account]
? Link to existing project? [Y/n] → Y
? What's the name of your existing project? → speedboat-agent
```

This will create a `.vercel` folder with your project configuration.

### Step 3: Test the Link
Verify the link worked:
```bash
vercel env pull .env.local
```

This should download your environment variables (don't commit this file!).

## What Happens Next

After linking, you'll be able to:

1. **Deploy previews** from any branch:
   ```bash
   vercel
   ```

2. **Deploy to production** after merging PR #59:
   ```bash
   vercel --prod
   ```

## GitHub Secrets for CI/CD

After linking, get these values for GitHub Actions:

1. **Get your Vercel Token**:
   - Go to: https://vercel.com/account/tokens
   - Create new token
   - Name it: `github-actions-speedboat`
   - Copy the token

2. **Get Project and Org IDs**:
   After linking, run:
   ```bash
   cat .vercel/project.json
   ```

   You'll see:
   ```json
   {
     "projectId": "prj_xxxxxxxxxxxxx",
     "orgId": "team_xxxxxxxxxxxxx"
   }
   ```

3. **Add to GitHub Repository**:
   - Go to: https://github.com/afoxnyc3/speedboatAgent/settings/secrets/actions
   - Add these secrets:
     - `VERCEL_TOKEN`: Your token from step 1
     - `VERCEL_PROJECT_ID`: The projectId from step 2
     - `VERCEL_ORG_ID`: The orgId from step 2

## Quick Verification

After linking, test that everything works:

```bash
# Check project info
vercel whoami

# List recent deployments
vercel ls

# Check environment variables
vercel env ls
```

## Next Steps

1. ✅ Complete the manual login and link steps above
2. ✅ Merge PR #59 to get `vercel.json` into main branch
3. ✅ Add GitHub secrets for automated deployments
4. ✅ Deploy with new configuration: `vercel --prod`

---

**Note**: The middleware error on `/api/search` will be fixed once `vercel.json` is deployed (from PR #59).