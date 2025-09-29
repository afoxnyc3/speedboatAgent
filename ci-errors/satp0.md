# the following was log of the last workflow failing:

# docs: mark Issue #60 as complete - content miscategorization fixed (#67) #19


Run actions/github-script@v7
RequestError [HttpError]: Resource not accessible by integration
    at /home/runner/work/_actions/actions/github-script/v7/dist/index.js:9537:21
    at process.processTicksAndRejections (node:internal/process/task_queues:95:5)
    at async eval (eval at callAsyncFunction (/home/runner/work/_actions/actions/github-script/v7/dist/index.js:36187:16), <anonymous>:6:1)
    at async main (/home/runner/work/_actions/actions/github-script/v7/dist/index.js:36285:20) {
  status: 403,
  response: {
    url: 'https://api.github.com/repos/afoxnyc3/speedboatAgent/statuses/ec9749e3f3233158ae982dd5889fdea5bc753753',
    status: 403,
    headers: {
      'access-control-allow-origin': '*',
      'access-control-expose-headers': 'ETag, Link, Location, Retry-After, X-GitHub-OTP, X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Used, X-RateLimit-Resource, X-RateLimit-Reset, X-OAuth-Scopes, X-Accepted-OAuth-Scopes, X-Poll-Interval, X-GitHub-Media-Type, X-GitHub-SSO, X-GitHub-Request-Id, Deprecation, Sunset',
      'content-encoding': 'gzip',
      'content-security-policy': "default-src 'none'",
      'content-type': 'application/json; charset=utf-8',
      date: 'Sat, 27 Sep 2025 18:01:20 GMT',
      'referrer-policy': 'origin-when-cross-origin, strict-origin-when-cross-origin',
      server: 'github.com',
      'strict-transport-security': 'max-age=31536000; includeSubdomains; preload',
      'transfer-encoding': 'chunked',
      vary: 'Accept-Encoding, Accept, X-Requested-With',
      'x-accepted-github-permissions': 'statuses=write',
      'x-content-type-options': 'nosniff',
      'x-frame-options': 'deny',
      'x-github-api-version-selected': '2022-11-28',
      'x-github-media-type': 'github.v3; format=json',
      'x-github-request-id': 'C808:2EE45C:BA41B0E:24DB0F67:68D82670',
      'x-ratelimit-limit': '5000',
      'x-ratelimit-remaining': '4995',
      'x-ratelimit-reset': '1758997934',
      'x-ratelimit-resource': 'core',
      'x-ratelimit-used': '5',
      'x-xss-protection': '0'
    },
    data: {
      message: 'Resource not accessible by integration',
      documentation_url: 'https://docs.github.com/rest/commits/statuses#create-a-commit-status',
      status: '403'
    }
  },
  request: {
    method: 'POST',
    url: 'https://api.github.com/repos/afoxnyc3/speedboatAgent/statuses/ec9749e3f3233158ae982dd5889fdea5bc753753',
    headers: {
      accept: 'application/vnd.github.v3+json',
      'user-agent': 'actions/github-script octokit-core.js/5.0.1 Node.js/20.19.4 (linux; x64)',
      authorization: 'token [REDACTED]',
      'content-type': 'application/json; charset=utf-8'
    },
    body: '{"state":"failure","target_url":"https://speedboat-agent-1alq072bo-afoxnycs-projects.vercel.app","description":"Production deployment ❌ Failed","context":"vercel/production"}',
    request: {
      agent: [Agent],
      fetch: [Function: proxyFetch],
      hook: [Function: bound bound register]
    }
  }
}
Error: Unhandled error: HttpError: Resource not accessible by integration
The job failed because it timed out waiting for http://localhost:3000/api/health to respond during the E2E Tests workflow. This usually means the Next.js server did not start correctly or the health endpoint was not reachable.

Key error:
Error: Timed out waiting for: http://localhost:3000/api/health

Log hints:

“Redis credentials not found, using memory cache” (should not block startup, but check if your app expects Redis)
“invalid-next-config” warning: There’s a Next.js config issue flagged in the logs (see: https://nextjs.org/docs/messages/invalid-next-config)
Recommended solutions:

Fix Next.js config error:

Review your next.config.js for any syntax or configuration errors. Invalid config can prevent the server from starting.
Reference: next.config.js documentation
Example fix:
js
// Make sure your next.config.js exports an object
module.exports = {
  reactStrictMode: true,
  // other config...
}
Check for misplaced exports, typos, or unsupported keys.
Make sure server starts before tests:

Your E2E workflow should wait for the Next.js server to be fully up before running tests.
If you use wait-on, ensure your server starts and binds to port 3000.
If Redis is required for startup, set the necessary environment variables or mock dependencies.
If using Docker or a custom script, confirm the startup command is correct.
Double-check health endpoint:

Confirm /api/health route exists and responds correctly in your Next.js app.
Example API route:
js
// pages/api/health.js
export default function handler(req, res) {
  res.status(200).json({ status: 'ok' });
}
Action steps:

Fix any issues in next.config.js so the Next.js server starts cleanly.
Ensure /api/health responds successfully.
Rerun the workflow.


Run if [ "failure" == "success" ]; then
❌ Demo readiness check failed!
⚠️  Some E2E tests failed. Review test results before demo.
Error: Process completed with exit code 1.
