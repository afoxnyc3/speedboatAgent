#!/usr/bin/env npx tsx

async function test() {
  const start = Date.now();
  const response = await fetch('http://localhost:3000/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: 'test performance', maxSources: 1 }),
    signal: AbortSignal.timeout(20000),
  });

  const elapsed = Date.now() - start;
  console.log('Request completed in:', elapsed, 'ms');
  console.log('Status:', response.status);

  // Check all headers
  const headers: Record<string, string> = {};
  response.headers.forEach((value, key) => {
    headers[key] = value;
  });

  console.log('\nPerformance headers:');
  Object.entries(headers)
    .filter(([key]) => key.startsWith('x-performance-'))
    .forEach(([key, value]) => console.log(`  ${key}: ${value}`));

  if (response.ok) {
    const data = await response.json();
    console.log('\nResponse structure:', Object.keys(data));
    console.log('Response preview:', JSON.stringify(data, null, 2).substring(0, 500));
  }
}

test().catch(console.error);