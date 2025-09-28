#!/usr/bin/env npx tsx
/**
 * Direct test to see server console output
 */

async function test() {
  console.log('Making request to chat API...');

  const response = await fetch('http://localhost:3000/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: 'test', maxSources: 1 }),
    signal: AbortSignal.timeout(10000),
  });

  console.log('Response status:', response.status);
  console.log('Response headers:', Object.fromEntries(response.headers.entries()));

  if (response.ok) {
    const data = await response.json();
    console.log('Response data:', data);
  } else {
    console.log('Failed response');
  }
}

test().catch(console.error);