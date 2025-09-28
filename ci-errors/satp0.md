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
