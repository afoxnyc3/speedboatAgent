import { test, expect } from '@playwright/test';

/**
 * DOM Investigation Test
 *
 * This test captures detailed information about the DOM element that's stuttering
 * to understand exactly what's causing the layout instability.
 */

const TEST_URL = process.env.PLAYWRIGHT_BASE_URL || 'https://speedboat-agent.vercel.app';
const TEST_MESSAGE = 'What is RAG and how does it work? Please explain in detail.';

test.describe('DOM Structure Investigation', () => {
  test('should capture detailed DOM information during streaming', async ({ page }) => {
    console.log('🔬 Starting DOM investigation...');

    // Navigate
    await page.goto(TEST_URL);
    await page.waitForLoadState('networkidle');

    // Find textarea and send message
    const textarea = page.locator('textarea').first();
    await textarea.waitFor({ state: 'visible' });
    await textarea.fill(TEST_MESSAGE);
    await textarea.press('Enter');

    console.log('🚀 Message sent, capturing DOM structure...');

    // Wait a moment for rendering to start
    await page.waitForTimeout(1000);

    // Capture the full DOM structure and positions of all key elements
    const domSnapshot1 = await page.evaluate(() => {
      const result: any = {
        timestamp: Date.now(),
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight,
          scrollY: window.scrollY
        },
        elements: []
      };

      // Find all elements that could be related to streaming
      const selectors = [
        '[role="log"]',
        '.animate-bounce',
        '[data-role="assistant"]',
        '.space-y-6',
        'div:has(> *:contains("Searching"))',
        'div:has(> *:contains("Analyzing"))',
        'div:has(> *:contains("Generating"))',
        'div:has(> *:contains("Streaming"))',
      ];

      // Get all messages
      const messages = document.querySelectorAll('[data-role="user"], [data-role="assistant"]');
      messages.forEach((el, index) => {
        const rect = el.getBoundingClientRect();
        result.elements.push({
          type: 'message',
          index,
          role: el.getAttribute('data-role'),
          text: el.textContent?.slice(0, 50),
          position: { x: rect.x, y: rect.y },
          size: { width: rect.width, height: rect.height },
          classes: el.className,
          id: el.id
        });
      });

      // Get streaming indicators
      const indicators = document.querySelectorAll('.animate-bounce');
      indicators.forEach((el, index) => {
        const rect = el.getBoundingClientRect();
        const parent = el.closest('[role]') || el.parentElement;
        const parentRect = parent?.getBoundingClientRect();

        result.elements.push({
          type: 'streaming-indicator',
          index,
          text: el.textContent,
          position: { x: rect.x, y: rect.y },
          size: { width: rect.width, height: rect.height },
          parent: {
            tag: parent?.tagName,
            position: parentRect ? { x: parentRect.x, y: parentRect.y } : null,
            size: parentRect ? { width: parentRect.width, height: parentRect.height } : null
          }
        });
      });

      // Get the main chat container
      const chatContainer = document.querySelector('[role="log"]');
      if (chatContainer) {
        const rect = chatContainer.getBoundingClientRect();
        result.chatContainer = {
          position: { x: rect.x, y: rect.y },
          size: { width: rect.width, height: rect.height },
          scrollTop: (chatContainer as HTMLElement).scrollTop,
          scrollHeight: (chatContainer as HTMLElement).scrollHeight
        };
      }

      return result;
    });

    console.log('\n📊 Initial DOM Snapshot:');
    console.log(JSON.stringify(domSnapshot1, null, 2));

    // Wait and capture again
    await page.waitForTimeout(3000);

    const domSnapshot2 = await page.evaluate(() => {
      const result: any = {
        timestamp: Date.now(),
        elements: []
      };

      const indicators = document.querySelectorAll('.animate-bounce');
      indicators.forEach((el, index) => {
        const rect = el.getBoundingClientRect();
        const parent = el.closest('[role]') || el.parentElement;
        const parentRect = parent?.getBoundingClientRect();

        result.elements.push({
          type: 'streaming-indicator',
          index,
          text: el.textContent,
          position: { x: rect.x, y: rect.y },
          size: { width: rect.width, height: rect.height },
          parent: {
            tag: parent?.tagName,
            position: parentRect ? { x: parentRect.x, y: parentRect.y } : null,
            size: parentRect ? { width: parentRect.width, height: parentRect.height } : null
          }
        });
      });

      return result;
    });

    console.log('\n📊 Second DOM Snapshot (3s later):');
    console.log(JSON.stringify(domSnapshot2, null, 2));

    // Calculate position changes
    if (domSnapshot1.elements.length > 0 && domSnapshot2.elements.length > 0) {
      const indicator1 = domSnapshot1.elements.find((e: any) => e.type === 'streaming-indicator');
      const indicator2 = domSnapshot2.elements.find((e: any) => e.type === 'streaming-indicator');

      if (indicator1 && indicator2) {
        const yDiff = indicator2.position.y - indicator1.position.y;
        console.log(`\n🎯 Streaming indicator moved ${yDiff}px vertically`);
      }
    }

    // Take a screenshot showing the issue
    await page.screenshot({
      path: 'test-results/dom-investigation.png',
      fullPage: true
    });

    console.log('\n✅ DOM investigation complete');
  });
});
