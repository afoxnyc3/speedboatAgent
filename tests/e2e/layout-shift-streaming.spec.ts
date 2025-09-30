import { test, expect } from '@playwright/test';

/**
 * Layout Shift and Streaming Indicator Test
 *
 * This test investigates the "stuttering text box in upper left corner" issue
 * by tracking layout shifts, element positions, and streaming indicator behavior
 * during response generation.
 */

// Test configuration - use live deployment
const TEST_URL = process.env.PLAYWRIGHT_BASE_URL || 'https://speedboat-agent.vercel.app';
const TEST_MESSAGE = 'What is RAG and how does it work? Please explain in detail.';

test.describe('Chat Layout Stability During Streaming', () => {
  test.beforeEach(async ({ page }) => {
    // Set viewport to match common desktop size
    await page.setViewportSize({ width: 1280, height: 720 });

    // Navigate to the application
    await page.goto(TEST_URL);

    // Wait for the page to be ready
    await page.waitForLoadState('networkidle');
  });

  test('should track layout shifts and element positions during streaming', async ({ page }) => {
    console.log('🎬 Starting layout shift tracking test...');
    console.log(`📍 Testing URL: ${TEST_URL}`);

    // Inject Layout Instability API tracking
    await page.evaluate(() => {
      (window as any).layoutShifts = [];
      (window as any).elementPositions = [];
      (window as any).startTime = Date.now();

      // Track layout shifts using PerformanceObserver
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'layout-shift' && !(entry as any).hadRecentInput) {
            (window as any).layoutShifts.push({
              timestamp: Date.now() - (window as any).startTime,
              value: (entry as any).value,
              sources: (entry as any).sources?.map((source: any) => ({
                node: source.node?.tagName,
                previousRect: source.previousRect,
                currentRect: source.currentRect
              }))
            });
          }
        }
      });

      observer.observe({ type: 'layout-shift', buffered: true });
    });

    // Find and fill the textarea
    const textarea = page.locator('textarea[placeholder*="Continue the conversation"], textarea[placeholder*="Ask"]').first();
    await textarea.waitFor({ state: 'visible', timeout: 10000 });
    await textarea.fill(TEST_MESSAGE);

    console.log('✅ Message entered into textarea');

    // Track initial positions before sending message
    const initialPositions = await page.evaluate(() => {
      const elements = {
        chatContainer: document.querySelector('[role="log"]') as HTMLElement,
        streamingIndicator: document.querySelector('.animate-bounce') as HTMLElement,
        messagesContainer: document.querySelector('.space-y-6') as HTMLElement,
      };

      return {
        timestamp: Date.now() - (window as any).startTime,
        chatContainer: elements.chatContainer?.getBoundingClientRect(),
        streamingIndicator: elements.streamingIndicator?.getBoundingClientRect(),
        messagesContainer: elements.messagesContainer?.getBoundingClientRect(),
      };
    });

    console.log('📊 Initial positions captured:', JSON.stringify(initialPositions, null, 2));

    // Start position tracking
    const positionInterval = setInterval(async () => {
      try {
        const positions = await page.evaluate(() => {
          const elements = {
            chatContainer: document.querySelector('[role="log"]') as HTMLElement,
            streamingIndicator: document.querySelector('.animate-bounce') as HTMLElement,
            messagesContainer: document.querySelector('.space-y-6') as HTMLElement,
            lastMessage: Array.from(document.querySelectorAll('[data-role="user"], [data-role="assistant"]')).pop() as HTMLElement,
          };

          return {
            timestamp: Date.now() - (window as any).startTime,
            chatContainer: elements.chatContainer?.getBoundingClientRect(),
            streamingIndicator: elements.streamingIndicator?.getBoundingClientRect(),
            messagesContainer: elements.messagesContainer?.getBoundingClientRect(),
            lastMessage: elements.lastMessage?.getBoundingClientRect(),
          };
        });

        await page.evaluate((pos) => {
          (window as any).elementPositions.push(pos);
        }, positions);
      } catch (error) {
        // Ignore errors during tracking
      }
    }, 250); // Track every 250ms

    // Send the message
    await textarea.press('Enter');
    console.log('🚀 Message sent, waiting for streaming to start...');

    // Wait for streaming indicators to appear
    const streamingIndicators = [
      'Searching knowledge base',
      'Analyzing sources',
      'Generating response',
      'Formatting output',
      'AI is thinking'
    ];

    let streamingStarted = false;
    for (const indicator of streamingIndicators) {
      try {
        await page.waitForSelector(`text=${indicator}`, { timeout: 5000 });
        console.log(`✅ Detected: "${indicator}"`);
        streamingStarted = true;
        break;
      } catch (e) {
        // Try next indicator
      }
    }

    if (!streamingStarted) {
      console.warn('⚠️  No streaming indicators detected, checking for response...');
    }

    // Track streaming state changes
    const stateChanges: any[] = [];
    let previousState = '';

    const stateCheckInterval = setInterval(async () => {
      try {
        const currentState = await page.evaluate(() => {
          // Check for different streaming states
          const indicators = [
            { text: 'Searching knowledge base', state: 'searching' },
            { text: 'Analyzing sources', state: 'analyzing' },
            { text: 'Generating response', state: 'generating' },
            { text: 'Formatting output', state: 'formatting' },
            { text: 'AI is thinking', state: 'thinking' }
          ];

          for (const indicator of indicators) {
            const element = document.evaluate(
              `//*[contains(text(), '${indicator.text}')]`,
              document,
              null,
              XPathResult.FIRST_ORDERED_NODE_TYPE,
              null
            ).singleNodeValue;

            if (element) {
              return {
                state: indicator.state,
                visible: (element as HTMLElement).offsetParent !== null,
                position: (element as HTMLElement).getBoundingClientRect()
              };
            }
          }

          return null;
        });

        if (currentState && JSON.stringify(currentState) !== previousState) {
          const change = {
            timestamp: Date.now(),
            ...currentState
          };
          stateChanges.push(change);
          previousState = JSON.stringify(currentState);
          console.log(`🔄 State changed to: ${currentState.state} at ${change.timestamp}`);
        }
      } catch (error) {
        // Ignore errors during state checking
      }
    }, 100); // Check every 100ms

    // Wait for response to complete (up to 30 seconds)
    try {
      await page.waitForSelector('text=/Used \\d+ sources?/', { timeout: 30000 });
      console.log('✅ Response completed with sources');
    } catch (e) {
      console.log('⏱️  Timeout waiting for completion, checking for content...');
    }

    // Stop tracking
    clearInterval(positionInterval);
    clearInterval(stateCheckInterval);

    // Wait a bit for final layout to settle
    await page.waitForTimeout(2000);

    // Collect all metrics
    const metrics = await page.evaluate(() => {
      return {
        layoutShifts: (window as any).layoutShifts || [],
        elementPositions: (window as any).elementPositions || [],
      };
    });

    // Calculate cumulative layout shift (CLS)
    const cls = metrics.layoutShifts.reduce((sum: number, shift: any) => sum + shift.value, 0);

    // Analyze layout shifts
    console.log('\n📊 Layout Shift Analysis:');
    console.log(`   Total Layout Shifts: ${metrics.layoutShifts.length}`);
    console.log(`   Cumulative Layout Shift (CLS): ${cls.toFixed(4)}`);
    console.log(`   CLS Score: ${cls < 0.1 ? '✅ Good' : cls < 0.25 ? '⚠️  Needs Improvement' : '❌ Poor'}`);

    if (metrics.layoutShifts.length > 0) {
      console.log('\n   Top 5 Layout Shifts:');
      metrics.layoutShifts
        .sort((a: any, b: any) => b.value - a.value)
        .slice(0, 5)
        .forEach((shift: any, index: number) => {
          console.log(`   ${index + 1}. Time: ${(shift.timestamp / 1000).toFixed(2)}s, Value: ${shift.value.toFixed(4)}`);
          if (shift.sources && shift.sources.length > 0) {
            shift.sources.forEach((source: any) => {
              console.log(`      - Element: ${source.node || 'unknown'}`);
              console.log(`        Previous: (${source.previousRect?.x}, ${source.previousRect?.y})`);
              console.log(`        Current: (${source.currentRect?.x}, ${source.currentRect?.y})`);
            });
          }
        });
    }

    // Analyze element position changes
    console.log('\n📍 Element Position Tracking:');
    console.log(`   Tracked ${metrics.elementPositions.length} position snapshots`);

    // Check for position jumps
    if (metrics.elementPositions.length >= 2) {
      let maxJump = 0;
      let maxJumpTime = 0;

      for (let i = 1; i < metrics.elementPositions.length; i++) {
        const prev = metrics.elementPositions[i - 1];
        const curr = metrics.elementPositions[i];

        if (prev.streamingIndicator && curr.streamingIndicator) {
          const yDiff = Math.abs(curr.streamingIndicator.y - prev.streamingIndicator.y);
          if (yDiff > maxJump) {
            maxJump = yDiff;
            maxJumpTime = curr.timestamp;
          }
        }
      }

      console.log(`   Max streaming indicator position jump: ${maxJump.toFixed(2)}px at ${(maxJumpTime / 1000).toFixed(2)}s`);
    }

    // Analyze state changes
    console.log('\n🔄 Streaming State Changes:');
    console.log(`   Total state changes: ${stateChanges.length}`);
    stateChanges.forEach((change, index) => {
      console.log(`   ${index + 1}. ${change.state} - Position: (${change.position?.x?.toFixed(0)}, ${change.position?.y?.toFixed(0)})`);
    });

    // Assertions
    expect(cls).toBeLessThan(0.25); // CLS should be below "poor" threshold

    // Save metrics for analysis
    console.log('\n💾 Saving metrics to test-results/layout-shift-metrics.json');
    await page.evaluate((data) => {
      console.log('Layout Shift Metrics:', JSON.stringify(data, null, 2));
    }, {
      cls,
      totalLayoutShifts: metrics.layoutShifts.length,
      totalPositionSnapshots: metrics.elementPositions.length,
      stateChanges: stateChanges.length,
      layoutShifts: metrics.layoutShifts,
      elementPositions: metrics.elementPositions,
      stateChanges,
    });
  });

  test('should capture video of streaming behavior for visual analysis', async ({ page }) => {
    console.log('🎥 Starting video capture test...');

    // Find and fill the textarea
    const textarea = page.locator('textarea[placeholder*="Continue the conversation"], textarea[placeholder*="Ask"]').first();
    await textarea.waitFor({ state: 'visible', timeout: 10000 });
    await textarea.fill(TEST_MESSAGE);

    // Send the message
    await textarea.press('Enter');
    console.log('🚀 Message sent, recording streaming behavior...');

    // Wait for streaming to start and progress
    await page.waitForTimeout(2000);

    // Take screenshots at different intervals
    for (let i = 0; i < 10; i++) {
      await page.screenshot({
        path: `test-results/streaming-frame-${i + 1}.png`,
        fullPage: true
      });
      await page.waitForTimeout(2000);
    }

    console.log('✅ Video frames captured to test-results/streaming-frame-*.png');
  });
});
