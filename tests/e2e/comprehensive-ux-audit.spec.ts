/**
 * Comprehensive UX Audit - Product Manager Perspective
 * Tests the complete user journey and identifies improvement opportunities
 */

import { test, expect, Page } from '@playwright/test';

// Helper function to measure user-perceived latency
async function measurePerceivedLatency(page: Page, action: () => Promise<void>) {
  const start = Date.now();
  await action();
  const end = Date.now();
  return end - start;
}

// Helper to capture user friction points
interface FrictionPoint {
  timestamp: number;
  type: 'latency' | 'confusion' | 'error' | 'accessibility' | 'visual';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  impact: string;
}

const frictionPoints: FrictionPoint[] = [];

function logFriction(type: FrictionPoint['type'], severity: FrictionPoint['severity'], description: string, impact: string) {
  frictionPoints.push({
    timestamp: Date.now(),
    type,
    severity,
    description,
    impact
  });
  console.log(`🔴 FRICTION [${severity}]: ${description} → ${impact}`);
}

test.describe('🎯 Comprehensive UX Audit - Product Manager Review', () => {
  const baseUrl = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';

  test.beforeEach(async ({ page }) => {
    // Clear friction points for each test
    frictionPoints.length = 0;

    // Capture console errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        logFriction('error', 'high', `Console error: ${msg.text()}`, 'User may experience broken functionality');
      }
    });

    // Capture failed requests
    page.on('requestfailed', request => {
      logFriction('error', 'critical', `Failed request: ${request.url()}`, 'Feature may not work');
    });
  });

  test('1️⃣ First-Time User Experience (FTUE)', async ({ page }) => {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 TEST 1: First-Time User Experience');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Measure page load time
    const loadTime = await measurePerceivedLatency(page, async () => {
      await page.goto(baseUrl);
    });

    console.log(`⏱️  Page Load Time: ${loadTime}ms`);
    if (loadTime > 3000) {
      logFriction('latency', 'high', `Slow initial load: ${loadTime}ms`, 'User may bounce before seeing content');
    }

    // Check for empty state messaging
    const emptyState = page.locator('text=RAG Assistant Ready');
    const hasEmptyState = await emptyState.isVisible();

    if (!hasEmptyState) {
      logFriction('confusion', 'medium', 'No clear empty state guidance', 'User unsure what to do next');
    } else {
      console.log('✅ Empty state present with clear CTA');
    }

    // Check placeholder text quality
    const textarea = page.locator('textarea');
    const placeholder = await textarea.getAttribute('placeholder');
    console.log(`📝 Placeholder: "${placeholder}"`);

    if (!placeholder || placeholder.length < 20) {
      logFriction('confusion', 'medium', 'Placeholder too vague', 'User unsure what queries are appropriate');
    }

    // Check for onboarding hints or example queries
    const hasExampleQueries = await page.locator('text=/example|try asking|sample/i').count();
    if (hasExampleQueries === 0) {
      logFriction('confusion', 'high', 'No example queries shown', 'User has to guess what to ask');
    }

    // Visual hierarchy check
    const mainHeading = await page.locator('h1, h2').first().textContent();
    console.log(`🏷️  Main Heading: "${mainHeading}"`);

    if (!mainHeading || mainHeading.length < 3) {
      logFriction('visual', 'medium', 'Unclear page purpose/branding', 'User confused about what this tool does');
    }
  });

  test('2️⃣ First Query Experience - Simple Question', async ({ page }) => {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 TEST 2: First Query Experience');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    await page.goto(baseUrl);

    const textarea = page.locator('textarea');
    const submitButton = page.locator('button[type="submit"]');

    // Check if submit button is intuitive
    const submitText = await submitButton.textContent();
    console.log(`🔘 Submit Button: "${submitText}"`);

    // Type a simple query
    const simpleQuery = 'What is RAG?';
    console.log(`💬 Query: "${simpleQuery}"`);

    await textarea.fill(simpleQuery);

    // Check for typing feedback
    const hasCharCount = await page.locator('text=/\\d+.*character/i').count();
    if (hasCharCount === 0) {
      console.log('ℹ️  No character counter (acceptable for simple use case)');
    }

    // Measure time to first response
    const timeToFirstResponse = await measurePerceivedLatency(page, async () => {
      await submitButton.click();

      // Wait for either status message or actual response
      await Promise.race([
        page.waitForSelector('text=/searching|processing|generating/i', { timeout: 5000 }),
        page.waitForSelector('[data-role="assistant"]', { timeout: 5000 })
      ]);
    });

    console.log(`⏱️  Time to First Feedback: ${timeToFirstResponse}ms`);

    if (timeToFirstResponse > 1000) {
      logFriction('latency', 'medium', `Slow initial feedback: ${timeToFirstResponse}ms`, 'User uncertain if action registered');
    }

    // Monitor streaming progress indicators
    const hasProgressIndicator = await page.locator('text=/searching|analyzing|generating/i').count() > 0;
    console.log(`📡 Progress Indicators: ${hasProgressIndicator ? 'Yes' : 'No'}`);

    if (!hasProgressIndicator) {
      logFriction('confusion', 'medium', 'No progress feedback during wait', 'User uncertain what\'s happening');
    }

    // Wait for complete response
    await page.waitForSelector('text=/RAG|Retrieval.Augmented.Generation/i', { timeout: 30000 });

    // Check if response has citations
    const hasCitations = await page.locator('text=/source|citation|reference/i').count() > 0;
    console.log(`📚 Citations Present: ${hasCitations}`);

    if (!hasCitations) {
      logFriction('confusion', 'high', 'No visible source attribution', 'User cannot verify answer accuracy');
    }
  });

  test('3️⃣ Complex Query Experience', async ({ page }) => {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 TEST 3: Complex Query Experience');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    await page.goto(baseUrl);

    const complexQuery = 'Explain the RAG system architecture and how hybrid search works. Include technical details about vector embeddings and semantic search.';
    console.log(`💬 Complex Query: "${complexQuery.slice(0, 60)}..."`);

    const textarea = page.locator('textarea');
    await textarea.fill(complexQuery);

    // Check textarea expansion behavior
    const initialHeight = await textarea.boundingBox().then(box => box?.height || 0);
    console.log(`📏 Textarea Initial Height: ${initialHeight}px`);

    if (initialHeight < 80) {
      logFriction('visual', 'low', 'Textarea too small for long queries', 'User has to scroll within input');
    }

    const submitButton = page.locator('button[type="submit"]');

    // Measure total response time
    const startTime = Date.now();
    await submitButton.click();

    // Track streaming stages
    const stages: Array<{stage: string; timestamp: number}> = [];

    // Monitor for stage changes
    const stageLocator = page.locator('text=/searching|analyzing|generating|formatting/i');

    try {
      for (let i = 0; i < 4; i++) {
        const stageText = await stageLocator.first().textContent({ timeout: 5000 });
        if (stageText) {
          stages.push({ stage: stageText, timestamp: Date.now() - startTime });
          console.log(`  📍 Stage: ${stageText} (${Date.now() - startTime}ms)`);
        }
      }
    } catch {
      // Stages may complete quickly
    }

    // Wait for response to complete
    await page.waitForSelector('[data-role="assistant"]', { timeout: 30000 });

    const totalTime = Date.now() - startTime;
    console.log(`⏱️  Total Response Time: ${totalTime}ms`);

    if (totalTime > 15000) {
      logFriction('latency', 'high', `Very slow response: ${totalTime}ms`, 'User may abandon or lose trust');
    } else if (totalTime > 8000) {
      logFriction('latency', 'medium', `Slow response: ${totalTime}ms`, 'User may become impatient');
    }

    // Check for incremental value delivery
    const firstWords = await page.locator('[data-role="assistant"]').first().textContent();
    console.log(`📝 First words visible: "${firstWords?.slice(0, 50)}..."`);

    // Check source preview during streaming
    const hasSourcePreview = await page.locator('text=/found.*sources|relevant sources/i').count() > 0;
    console.log(`🔍 Source Preview During Streaming: ${hasSourcePreview}`);

    if (!hasSourcePreview) {
      console.log('ℹ️  No source preview during streaming (may feel slower)');
    }
  });

  test('4️⃣ Multi-Turn Conversation Flow', async ({ page }) => {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 TEST 4: Multi-Turn Conversation');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    await page.goto(baseUrl);

    const queries = [
      'What is hybrid search?',
      'How does it compare to traditional search?',
      'Show me an example'
    ];

    for (let i = 0; i < queries.length; i++) {
      console.log(`\n💬 Turn ${i + 1}: "${queries[i]}"`);

      const textarea = page.locator('textarea');
      await textarea.fill(queries[i]);
      await page.locator('button[type="submit"]').click();

      // Wait for response
      await page.waitForSelector(`[data-role="assistant"]:nth-of-type(${(i * 2) + 2})`, { timeout: 30000 });

      // Check if previous context is visible
      const messageCount = await page.locator('[data-role="user"], [data-role="assistant"]').count();
      console.log(`  📊 Total messages visible: ${messageCount}`);

      if (messageCount < (i + 1) * 2) {
        logFriction('confusion', 'high', 'Previous messages disappeared', 'User loses conversation context');
      }

      // Check scroll behavior
      const isScrolledToBottom = await page.evaluate(() => {
        const container = document.querySelector('[class*="overflow-y-auto"]');
        if (!container) return false;
        return container.scrollHeight - container.scrollTop - container.clientHeight < 100;
      });

      if (!isScrolledToBottom) {
        logFriction('visual', 'medium', 'Not auto-scrolled to latest message', 'User misses new responses');
      }
    }

    // Check for conversation summary or thread management
    const hasThreadManagement = await page.locator('button:has-text(/new|clear|reset/i)').count() > 0;
    console.log(`\n🧵 Thread Management: ${hasThreadManagement ? 'Yes' : 'No'}`);

    if (!hasThreadManagement) {
      console.log('ℹ️  No clear way to start fresh conversation');
    }
  });

  test('5️⃣ Error Handling & Recovery', async ({ page }) => {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 TEST 5: Error Handling');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    await page.goto(baseUrl);

    // Test 1: Empty query
    const submitButton = page.locator('button[type="submit"]');
    const isDisabled = await submitButton.isDisabled();
    console.log(`🚫 Submit disabled when empty: ${isDisabled}`);

    if (!isDisabled) {
      logFriction('error', 'medium', 'Can submit empty query', 'User wastes time on invalid action');
    }

    // Test 2: Very long query
    const veryLongQuery = 'a '.repeat(1000);
    const textarea = page.locator('textarea');
    await textarea.fill(veryLongQuery);

    const hasLengthWarning = await page.locator('text=/too long|character limit|maximum/i').count() > 0;
    console.log(`⚠️  Length warning shown: ${hasLengthWarning}`);

    if (!hasLengthWarning) {
      console.log('ℹ️  No character limit warning (may cause backend errors)');
    }

    // Test 3: Network timeout simulation
    console.log('\n🔌 Testing timeout behavior...');
    await textarea.fill('What is RAG?');

    // Intercept and delay response
    await page.route('**/api/chat/stream', route => {
      setTimeout(() => route.abort(), 20000);
    });

    await submitButton.click();

    // Wait for error message
    const hasErrorMessage = await page.locator('text=/error|failed|try again/i').count() > 0;

    await page.waitForTimeout(3000);

    console.log(`❌ Error message shown: ${hasErrorMessage}`);

    if (!hasErrorMessage) {
      logFriction('error', 'critical', 'No error feedback on failure', 'User stuck with broken experience');
    }
  });

  test('6️⃣ Visual Polish & Accessibility', async ({ page }) => {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 TEST 6: Visual Polish & Accessibility');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    await page.goto(baseUrl);

    // Check color contrast
    const bgColor = await page.locator('body').evaluate(el =>
      window.getComputedStyle(el).backgroundColor
    );
    console.log(`🎨 Background: ${bgColor}`);

    // Check for loading skeletons
    const textarea = page.locator('textarea');
    await textarea.fill('Test query');
    await page.locator('button[type="submit"]').click();

    const hasSkeletonLoader = await page.locator('[class*="skeleton"], [class*="shimmer"], [class*="pulse"]').count() > 0;
    console.log(`💀 Skeleton loaders: ${hasSkeletonLoader}`);

    if (!hasSkeletonLoader) {
      console.log('ℹ️  No skeleton loaders (may feel less polished)');
    }

    // Check keyboard navigation
    await page.goto(baseUrl);
    await page.keyboard.press('Tab');
    const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
    console.log(`⌨️  First tab focuses: ${focusedElement}`);

    if (focusedElement !== 'TEXTAREA') {
      logFriction('accessibility', 'medium', 'Tab doesn\'t focus input first', 'Keyboard users have friction');
    }

    // Check focus indicators
    const hasFocusIndicator = await page.locator('textarea:focus').evaluate(el => {
      const styles = window.getComputedStyle(el);
      return styles.outline !== 'none' || styles.boxShadow !== 'none';
    });
    console.log(`🔍 Focus indicators visible: ${hasFocusIndicator}`);

    if (!hasFocusIndicator) {
      logFriction('accessibility', 'high', 'No visible focus indicators', 'Keyboard users can\'t track position');
    }

    // Check for ARIA labels
    const textareaLabel = await textarea.getAttribute('aria-label');
    console.log(`🏷️  Textarea ARIA label: "${textareaLabel}"`);

    if (!textareaLabel) {
      logFriction('accessibility', 'medium', 'Missing ARIA labels', 'Screen reader users confused');
    }
  });

  test('7️⃣ Mobile Responsiveness', async ({ page, context }) => {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 TEST 7: Mobile Experience');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE
    await page.goto(baseUrl);

    // Check if UI adapts
    const textarea = page.locator('textarea');
    const textareaBox = await textarea.boundingBox();

    console.log(`📱 Textarea width: ${textareaBox?.width}px (viewport: 375px)`);

    if (textareaBox && textareaBox.width > 375) {
      logFriction('visual', 'high', 'Horizontal overflow on mobile', 'User has to scroll horizontally');
    }

    // Check touch target sizes
    const submitButton = page.locator('button[type="submit"]');
    const buttonBox = await submitButton.boundingBox();

    console.log(`👆 Submit button size: ${buttonBox?.width}x${buttonBox?.height}px`);

    if (buttonBox && (buttonBox.width < 44 || buttonBox.height < 44)) {
      logFriction('accessibility', 'high', 'Touch target too small (<44px)', 'Mobile users struggle to tap');
    }

    // Test typing on mobile
    await textarea.fill('Mobile test query');
    await submitButton.click();

    // Check if keyboard covers input
    await page.waitForTimeout(1000);
    const isInputVisible = await textarea.isVisible();
    console.log(`⌨️  Input visible during streaming: ${isInputVisible}`);

    // Check response readability
    await page.waitForSelector('[data-role="assistant"]', { timeout: 30000 });
    const responseText = await page.locator('[data-role="assistant"]').first().textContent();
    const lineLength = responseText?.split('\n')[0].length || 0;

    console.log(`📏 First line length: ${lineLength} chars`);

    if (lineLength > 60) {
      console.log('ℹ️  Text may be hard to read on mobile (long lines)');
    }
  });

  test.afterAll(async () => {
    console.log('\n\n═══════════════════════════════════════════════════');
    console.log('📊 UX AUDIT SUMMARY');
    console.log('═══════════════════════════════════════════════════\n');

    // Categorize friction points
    const critical = frictionPoints.filter(f => f.severity === 'critical');
    const high = frictionPoints.filter(f => f.severity === 'high');
    const medium = frictionPoints.filter(f => f.severity === 'medium');
    const low = frictionPoints.filter(f => f.severity === 'low');

    console.log(`🔴 Critical Issues: ${critical.length}`);
    critical.forEach(f => console.log(`   • ${f.description}`));

    console.log(`\n🟠 High Priority: ${high.length}`);
    high.forEach(f => console.log(`   • ${f.description}`));

    console.log(`\n🟡 Medium Priority: ${medium.length}`);
    medium.forEach(f => console.log(`   • ${f.description}`));

    console.log(`\n⚪ Low Priority: ${low.length}`);
    low.forEach(f => console.log(`   • ${f.description}`));

    console.log('\n═══════════════════════════════════════════════════\n');
  });
});
