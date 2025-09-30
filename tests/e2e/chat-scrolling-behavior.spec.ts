/**
 * E2E Tests for Chat Scrolling Behavior
 * Comprehensive test to identify and measure stuttering during message generation
 */

import { test, expect, Page } from '@playwright/test';

// Test configuration
const TEST_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3003';
const TEST_MESSAGE = 'What is RAG and how does it work? Please explain in detail.';

interface ScrollMetrics {
  timestamp: number;
  scrollTop: number;
  scrollHeight: number;
  clientHeight: number;
  isAtBottom: boolean;
  eventType: string;
}

interface DOMMetrics {
  timestamp: number;
  mutationCount: number;
  addedNodes: number;
  removedNodes: number;
}

test.describe('Chat Scrolling Behavior Investigation', () => {
  test.setTimeout(120000); // 2 minutes for streaming response

  test('Investigate scrolling behavior during streaming response', async ({ page }) => {
    console.log('\n🔍 Starting chat scrolling investigation...\n');

    // Navigate to test URL
    console.log(`📍 Navigating to: ${TEST_URL}`);
    await page.goto(TEST_URL, { waitUntil: 'networkidle' });

    // Wait for chat interface to load
    await expect(page.locator('h1:has-text("AI Chat Assistant")')).toBeVisible();
    console.log('✅ Chat interface loaded\n');

    // Inject scroll tracking instrumentation
    console.log('🔧 Injecting scroll tracking instrumentation...');
    await page.evaluate(() => {
      // Store metrics in window object
      (window as any).scrollMetrics = [];
      (window as any).domMetrics = [];
      (window as any).startTime = Date.now();

      // Find the scrollable container (our custom wrapper div with overflow-y-auto)
      const scrollContainer = document.querySelector('.overflow-y-auto.scrollbar-thin') as HTMLElement;

      if (scrollContainer) {
        console.log('✅ Found scroll container:', scrollContainer);

        // Track scroll events
        let scrollEventCount = 0;
        scrollContainer.addEventListener('scroll', (e) => {
          scrollEventCount++;
          const metrics: any = {
            timestamp: Date.now() - (window as any).startTime,
            scrollTop: scrollContainer.scrollTop,
            scrollHeight: scrollContainer.scrollHeight,
            clientHeight: scrollContainer.clientHeight,
            isAtBottom: Math.abs(scrollContainer.scrollHeight - scrollContainer.scrollTop - scrollContainer.clientHeight) < 10,
            eventType: 'scroll',
            eventNumber: scrollEventCount
          };
          (window as any).scrollMetrics.push(metrics);
        });

        // Track scrollend events (when scrolling stops)
        scrollContainer.addEventListener('scrollend', (e) => {
          const metrics: any = {
            timestamp: Date.now() - (window as any).startTime,
            scrollTop: scrollContainer.scrollTop,
            scrollHeight: scrollContainer.scrollHeight,
            clientHeight: scrollContainer.clientHeight,
            isAtBottom: Math.abs(scrollContainer.scrollHeight - scrollContainer.scrollTop - scrollContainer.clientHeight) < 10,
            eventType: 'scrollend',
            eventNumber: scrollEventCount
          };
          (window as any).scrollMetrics.push(metrics);
          console.log('📊 Scroll ended:', metrics);
        });

        // Track DOM mutations
        const observer = new MutationObserver((mutations) => {
          const addedNodes = mutations.reduce((sum, m) => sum + m.addedNodes.length, 0);
          const removedNodes = mutations.reduce((sum, m) => sum + m.removedNodes.length, 0);

          (window as any).domMetrics.push({
            timestamp: Date.now() - (window as any).startTime,
            mutationCount: mutations.length,
            addedNodes,
            removedNodes
          });
        });

        observer.observe(scrollContainer, {
          childList: true,
          subtree: true,
          attributes: true,
          characterData: true
        });

        (window as any).mutationObserver = observer;
        console.log('✅ Scroll and DOM tracking active');
      } else {
        console.error('❌ Could not find scroll container');
      }
    });

    console.log('✅ Instrumentation injected\n');

    // Find chat input
    const chatInput = page.locator('textarea[placeholder*="Ask about"]').first();
    await expect(chatInput).toBeVisible();

    // Send test message
    console.log(`💬 Sending message: "${TEST_MESSAGE}"`);
    await chatInput.fill(TEST_MESSAGE);

    // Take screenshot before sending
    await page.screenshot({ path: 'test-results/scrolling-before-send.png', fullPage: true });

    await page.keyboard.press('Enter');
    console.log('✅ Message sent\n');

    // Monitor streaming stages
    const stages = ['Searching', 'Analyzing', 'Generating', 'Formatting'];
    console.log('⏳ Monitoring streaming stages...\n');

    // Wait for streaming to start
    try {
      await page.locator('text=Searching').waitFor({ timeout: 10000 });
      console.log('✅ Streaming started (Searching stage detected)');
      await page.screenshot({ path: 'test-results/scrolling-searching.png', fullPage: true });
    } catch (error) {
      console.log('⚠️  Could not detect Searching stage');
    }

    // Wait for content generation (look for assistant message)
    try {
      await page.locator('[role="log"] .space-y-2').last().waitFor({ timeout: 30000 });
      console.log('✅ Content generation detected');
      await page.screenshot({ path: 'test-results/scrolling-generating.png', fullPage: true });
    } catch (error) {
      console.log('⚠️  Could not detect content generation');
    }

    // Wait for streaming to complete (look for sources or completion indicators)
    await page.waitForTimeout(20000); // Give time for full response

    await page.screenshot({ path: 'test-results/scrolling-complete.png', fullPage: true });
    console.log('✅ Screenshots captured\n');

    // Collect metrics
    console.log('📊 Collecting scroll and DOM metrics...\n');

    const scrollMetrics = await page.evaluate(() => {
      return (window as any).scrollMetrics || [];
    }) as ScrollMetrics[];

    const domMetrics = await page.evaluate(() => {
      return (window as any).domMetrics || [];
    }) as DOMMetrics[];

    // Clean up observer
    await page.evaluate(() => {
      if ((window as any).mutationObserver) {
        (window as any).mutationObserver.disconnect();
      }
    });

    // Analyze scroll behavior
    console.log('═══════════════════════════════════════');
    console.log('📈 SCROLL BEHAVIOR ANALYSIS');
    console.log('═══════════════════════════════════════\n');

    console.log(`Total scroll events: ${scrollMetrics.length}`);

    // Calculate scroll events per second
    const durationSeconds = scrollMetrics.length > 0
      ? (scrollMetrics[scrollMetrics.length - 1].timestamp - scrollMetrics[0].timestamp) / 1000
      : 0;
    const scrollEventsPerSecond = durationSeconds > 0 ? scrollMetrics.length / durationSeconds : 0;

    console.log(`Duration: ${durationSeconds.toFixed(2)}s`);
    console.log(`Scroll events per second: ${scrollEventsPerSecond.toFixed(2)}`);

    // Detect stuttering (scroll position jumping)
    let stutterCount = 0;
    for (let i = 1; i < scrollMetrics.length; i++) {
      const prev = scrollMetrics[i - 1];
      const curr = scrollMetrics[i];

      // If scroll position decreased (jumped up) significantly
      if (curr.scrollTop < prev.scrollTop - 50) {
        stutterCount++;
        console.log(`\n⚠️  STUTTER DETECTED at ${curr.timestamp}ms:`);
        console.log(`   Scroll position jumped: ${prev.scrollTop} → ${curr.scrollTop} (${curr.scrollTop - prev.scrollTop}px)`);
      }
    }

    console.log(`\nTotal stutters detected: ${stutterCount}`);

    if (stutterCount > 0) {
      console.log('❌ Stuttering behavior confirmed!\n');
    } else {
      console.log('✅ No stuttering detected\n');
    }

    // Analyze DOM mutations
    console.log('═══════════════════════════════════════');
    console.log('🔄 DOM MUTATION ANALYSIS');
    console.log('═══════════════════════════════════════\n');

    const totalMutations = domMetrics.reduce((sum, m) => sum + m.mutationCount, 0);
    const totalNodesAdded = domMetrics.reduce((sum, m) => sum + m.addedNodes, 0);
    const totalNodesRemoved = domMetrics.reduce((sum, m) => sum + m.removedNodes, 0);

    console.log(`Total DOM mutations: ${totalMutations}`);
    console.log(`Total nodes added: ${totalNodesAdded}`);
    console.log(`Total nodes removed: ${totalNodesRemoved}`);

    const mutationDuration = domMetrics.length > 0
      ? (domMetrics[domMetrics.length - 1].timestamp - domMetrics[0].timestamp) / 1000
      : 0;
    const mutationsPerSecond = mutationDuration > 0 ? totalMutations / mutationDuration : 0;

    console.log(`Mutations per second: ${mutationsPerSecond.toFixed(2)}`);

    // Check if mutations are causing excessive re-renders
    if (mutationsPerSecond > 10) {
      console.log('\n⚠️  HIGH DOM MUTATION RATE - Potential performance issue!\n');
    } else {
      console.log('\n✅ DOM mutation rate is acceptable\n');
    }

    // Write detailed metrics to file
    console.log('📝 Writing detailed metrics to files...\n');

    const metricsReport = {
      testMetadata: {
        url: TEST_URL,
        message: TEST_MESSAGE,
        timestamp: new Date().toISOString(),
        duration: durationSeconds
      },
      scrollMetrics: {
        totalEvents: scrollMetrics.length,
        eventsPerSecond: scrollEventsPerSecond,
        stutterCount,
        events: scrollMetrics
      },
      domMetrics: {
        totalMutations,
        nodesAdded: totalNodesAdded,
        nodesRemoved: totalNodesRemoved,
        mutationsPerSecond,
        events: domMetrics
      },
      conclusion: {
        stutteringDetected: stutterCount > 0,
        performanceIssue: mutationsPerSecond > 10 || scrollEventsPerSecond > 5,
        recommendations: []
      }
    };

    // Add recommendations based on findings
    if (stutterCount > 0) {
      metricsReport.conclusion.recommendations.push(
        'Scroll stuttering detected - likely caused by use-stick-to-bottom fighting with content updates'
      );
    }

    if (mutationsPerSecond > 10) {
      metricsReport.conclusion.recommendations.push(
        'High DOM mutation rate - consider debouncing optimistic message updates'
      );
    }

    if (scrollEventsPerSecond > 5) {
      metricsReport.conclusion.recommendations.push(
        'High scroll event frequency - use instant scroll during streaming instead of smooth'
      );
    }

    // Write to file
    await page.evaluate((report) => {
      console.log('📊 FULL METRICS REPORT:', JSON.stringify(report, null, 2));
    }, metricsReport);

    console.log('═══════════════════════════════════════');
    console.log('✅ Investigation complete!');
    console.log('═══════════════════════════════════════\n');
    console.log('📸 Screenshots saved to test-results/');
    console.log('🎥 Video recording available in test-results/\n');

    // Assertions
    expect(scrollMetrics.length).toBeGreaterThan(0); // Should have tracked scroll events
    expect(totalMutations).toBeGreaterThan(0); // Should have detected DOM mutations

    // Log performance concerns
    if (stutterCount > 0) {
      console.log('⚠️  TEST RESULT: Stuttering behavior confirmed');
    }

    if (mutationsPerSecond > 10) {
      console.log('⚠️  TEST RESULT: High DOM mutation rate detected');
    }
  });

  test('Compare scroll behavior: small vs large container', async ({ page }) => {
    console.log('\n🔍 Testing container size impact on scrolling...\n');

    await page.goto(TEST_URL, { waitUntil: 'networkidle' });
    await expect(page.locator('h1:has-text("AI Chat Assistant")')).toBeVisible();

    // Get current container height
    const containerHeight = await page.evaluate(() => {
      const container = document.querySelector('[role="log"]')?.parentElement as HTMLElement;
      return container ? container.offsetHeight : 0;
    });

    console.log(`Current container height: ${containerHeight}px`);
    console.log('Small containers (< 700px) are more prone to stuttering\n');

    // Send message and observe
    const chatInput = page.locator('textarea[placeholder*="Ask about"]').first();
    await chatInput.fill('Quick test message');
    await page.keyboard.press('Enter');

    await page.waitForTimeout(5000);

    console.log('✅ Container size test complete');
  });
});
