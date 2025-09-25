---
description: Set up and deploy GitHub webhook integration for real-time repository updates
argument-hint: [repository-url] [webhook-url]
model: inherit
---

Configure and deploy GitHub webhook integration to enable real-time repository content updates for the RAG system.

This command will:
1. Generate webhook secret for signature verification
2. Configure GitHub repository webhook settings
3. Deploy webhook receiver endpoint (/api/ingest/github)
4. Set up BullMQ job processing for webhook events
5. Test webhook delivery and processing pipeline
6. Monitor webhook health and error handling

**Repository URL**: $1 (required - GitHub repository to monitor)
**Webhook URL**: $2 (optional - defaults to deployed API endpoint)

Example usage:
- `/deploy-webhook https://github.com/company/docs`
- `/deploy-webhook https://github.com/company/api https://api.company.com/webhook/github`

The deployment process will:
- Create secure webhook secret and store in environment
- Configure webhook to trigger on push, pull_request, and release events
- Set up signature verification for security
- Deploy BullMQ worker for async processing
- Implement retry logic and error handling
- Configure monitoring and alerting

Webhook Configuration:
- **Events**: push, pull_request, release
- **Content Type**: application/json
- **Secret**: Auto-generated HMAC-SHA256 verification
- **SSL**: Required for production deployments

Processing Pipeline:
- Webhook receives → Signature verification → BullMQ job creation
- Background processing → LlamaIndex parsing → Weaviate indexing
- Target processing time: <30s per webhook event

Requires environment variables:
- GITHUB_TOKEN (for webhook management)
- GITHUB_WEBHOOK_SECRET (auto-generated if not exists)
- Deployment access to Vercel or hosting platform

After successful deployment, the system will automatically update vector embeddings whenever repository content changes.