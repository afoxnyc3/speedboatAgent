#!/usr/bin/env node

/**
 * Demo Fallback Server
 *
 * This server provides cached responses when the main application is unavailable.
 * Use this as a last resort during demo day if all other systems fail.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

// Configuration
const config = {
  port: process.env.FALLBACK_PORT || 8080,
  host: process.env.FALLBACK_HOST || '0.0.0.0',
  responsesFile: path.join(__dirname, '../../data/demo/demo-responses.json'),
  staticDir: path.join(__dirname, '../../public/demo')
};

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  const timestamp = new Date().toISOString();
  console.log(`${colors[color]}[${timestamp}] ${message}${colors.reset}`);
}

// Load demo responses
let demoResponses;
try {
  const responsesData = fs.readFileSync(config.responsesFile, 'utf8');
  demoResponses = JSON.parse(responsesData);
  log(`✅ Loaded ${Object.keys(demoResponses.responses).length} demo responses`, 'green');
} catch (error) {
  log(`❌ Failed to load demo responses: ${error.message}`, 'red');
  process.exit(1);
}

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400'
};

// Helper function to find best matching response
function findBestMatch(query) {
  const queryLower = query.toLowerCase();

  // Direct keyword matching
  const matches = Object.entries(demoResponses.responses).map(([key, data]) => {
    const responseQuery = data.query.toLowerCase();
    let score = 0;

    // Exact match
    if (queryLower === responseQuery) {
      score = 100;
    }
    // Contains all words
    else {
      const queryWords = queryLower.split(/\s+/);
      const responseWords = responseQuery.split(/\s+/);

      const matchingWords = queryWords.filter(word =>
        responseWords.some(respWord => respWord.includes(word) || word.includes(respWord))
      );

      score = (matchingWords.length / queryWords.length) * 80;
    }

    // Keyword bonuses
    const keywords = {
      'architecture': ['architecture', 'technical', 'stack', 'design'],
      'setup': ['setup', 'install', 'development', 'environment', 'configure'],
      'hybrid_search': ['search', 'hybrid', 'vector', 'weaviate', 'embedding'],
      'performance': ['performance', 'metrics', 'optimization', 'speed', 'cache'],
      'deployment': ['deploy', 'production', 'monitor', 'vercel', 'ci/cd']
    };

    for (const [responseKey, keywordList] of Object.entries(keywords)) {
      if (key === responseKey) {
        const keywordBonus = keywordList.reduce((bonus, keyword) => {
          return queryLower.includes(keyword) ? bonus + 10 : bonus;
        }, 0);
        score += keywordBonus;
      }
    }

    return { key, data, score };
  });

  // Sort by score and return best match
  matches.sort((a, b) => b.score - a.score);

  if (matches[0].score > 30) {
    return matches[0].data;
  }

  // Fallback to architecture explanation
  return demoResponses.responses.architecture;
}

// Request handler
function handleRequest(req, res) {
  const { pathname, query } = url.parse(req.url, true);

  log(`${req.method} ${pathname}`, 'cyan');

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(200, corsHeaders);
    res.end();
    return;
  }

  // Set CORS headers for all responses
  Object.entries(corsHeaders).forEach(([key, value]) => {
    res.setHeader(key, value);
  });

  try {
    // Health check endpoint
    if (pathname === '/api/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        status: 'healthy',
        mode: 'fallback',
        timestamp: new Date().toISOString(),
        message: 'Demo fallback server is running'
      }));
      return;
    }

    // Chat endpoint (main demo functionality)
    if (pathname === '/api/chat' && req.method === 'POST') {
      let body = '';

      req.on('data', chunk => {
        body += chunk.toString();
      });

      req.on('end', () => {
        try {
          const { message, sessionId } = JSON.parse(body);

          if (!message) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Message is required' }));
            return;
          }

          const response = findBestMatch(message);

          // Simulate response time delay
          setTimeout(() => {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              ...response,
              sessionId: sessionId || 'fallback-session',
              mode: 'fallback',
              timestamp: new Date().toISOString()
            }));

            log(`✅ Served response for: "${message}"`, 'green');
          }, 500); // 500ms delay to simulate processing

        } catch (error) {
          log(`❌ Error parsing request body: ${error.message}`, 'red');
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid JSON' }));
        }
      });

      return;
    }

    // Search endpoint
    if (pathname === '/api/search') {
      const searchQuery = query.q || '';

      if (!searchQuery) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Query parameter q is required' }));
        return;
      }

      const response = findBestMatch(searchQuery);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        results: [response],
        total: 1,
        mode: 'fallback',
        timestamp: new Date().toISOString()
      }));

      log(`✅ Served search for: "${searchQuery}"`, 'green');
      return;
    }

    // Demo responses list
    if (pathname === '/api/demo/responses') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(demoResponses));
      return;
    }

    // Static demo page
    if (pathname === '/' || pathname === '/demo') {
      const demoHtml = generateDemoHTML();
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(demoHtml);
      return;
    }

    // 404 for other routes
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      error: 'Not found',
      availableEndpoints: [
        '/api/health',
        '/api/chat',
        '/api/search',
        '/api/demo/responses',
        '/',
        '/demo'
      ]
    }));

  } catch (error) {
    log(`❌ Server error: ${error.message}`, 'red');
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Internal server error' }));
  }
}

// Generate demo HTML page
function generateDemoHTML() {
  const queries = Object.values(demoResponses.responses).map(r => r.query);

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>RAG Agent - Demo Fallback</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            background: #f5f5f5;
        }
        .container {
            background: white;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
        }
        .status {
            background: #fff3cd;
            color: #856404;
            padding: 15px;
            border-radius: 5px;
            margin-bottom: 20px;
            border: 1px solid #ffeaa7;
        }
        .query-button {
            display: block;
            width: 100%;
            padding: 15px;
            margin: 10px 0;
            background: #007bff;
            color: white;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            font-size: 16px;
            transition: background 0.2s;
        }
        .query-button:hover {
            background: #0056b3;
        }
        .response {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 5px;
            margin-top: 20px;
            border-left: 4px solid #007bff;
        }
        .sources {
            margin-top: 15px;
            font-size: 14px;
            color: #666;
        }
        .hidden {
            display: none;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🚀 RAG Agent - Demo Fallback</h1>
            <p>Emergency demo mode with cached responses</p>
        </div>

        <div class="status">
            ⚠️ <strong>Fallback Mode Active:</strong> This is serving cached responses for demo purposes.
        </div>

        <h3>Try these demo queries:</h3>

        ${queries.map((query, index) => `
            <button class="query-button" onclick="showResponse(${index})">
                ${query}
            </button>
        `).join('')}

        <div id="response-container" class="hidden">
            <div id="response" class="response"></div>
        </div>
    </div>

    <script>
        const responses = ${JSON.stringify(demoResponses.responses)};
        const queries = ${JSON.stringify(queries)};

        function showResponse(index) {
            const query = queries[index];
            const responseKey = Object.keys(responses)[index];
            const response = responses[responseKey];

            const responseContainer = document.getElementById('response-container');
            const responseDiv = document.getElementById('response');

            const sources = response.sources.map(source =>
                \`<div>📄 <strong>\${source.title}</strong> (relevance: \${Math.round(source.relevance * 100)}%)</div>\`
            ).join('');

            responseDiv.innerHTML = \`
                <h4>Query: \${query}</h4>
                <div style="white-space: pre-line; line-height: 1.6;">\${response.response}</div>
                <div class="sources">
                    <strong>Sources:</strong><br>
                    \${sources}
                </div>
                <div style="margin-top: 15px; font-size: 12px; color: #999;">
                    Response time: \${response.responseTime} | Generated: \${response.timestamp}
                </div>
            \`;

            responseContainer.classList.remove('hidden');
            responseContainer.scrollIntoView({ behavior: 'smooth' });
        }
    </script>
</body>
</html>
  `;
}

// Create HTTP server
const server = http.createServer(handleRequest);

// Error handling
server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    log(`❌ Port ${config.port} is already in use`, 'red');
    process.exit(1);
  } else {
    log(`❌ Server error: ${error.message}`, 'red');
    process.exit(1);
  }
});

// Graceful shutdown
process.on('SIGINT', () => {
  log('\n🛑 Shutting down fallback server...', 'yellow');
  server.close(() => {
    log('✅ Server closed gracefully', 'green');
    process.exit(0);
  });
});

// Start server
server.listen(config.port, config.host, () => {
  log('🚀 Demo Fallback Server Started', 'magenta');
  log(`🌐 Server URL: http://${config.host}:${config.port}`, 'cyan');
  log(`📁 Demo responses: ${Object.keys(demoResponses.responses).length} queries loaded`, 'cyan');
  log(`🎯 Demo page: http://${config.host}:${config.port}/demo`, 'cyan');
  console.log();
  log('Available endpoints:', 'blue');
  log('  GET  /              - Demo interface', 'blue');
  log('  GET  /api/health    - Health check', 'blue');
  log('  POST /api/chat      - Chat endpoint', 'blue');
  log('  GET  /api/search    - Search endpoint', 'blue');
  log('  GET  /api/demo/responses - All responses', 'blue');
  console.log();
  log('🎪 Ready for emergency demo mode!', 'green');
});

module.exports = { server, handleRequest };