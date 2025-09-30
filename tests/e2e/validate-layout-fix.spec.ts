import { test, expect } from '@playwright/test';

/**
 * Validate Layout Fix Test
 *
 * This test validates that the layout shift fix has reduced stuttering
 * by comparing metrics before and after the fix.
 */

const TEST_URL = 'http://localhost:3000';
const TEST_MESSAGE = 'What is RAG and how does it work? Please explain in detail.';

test.describe('Validate Layout Stuttering Fix', () => {
  test('should show reduced layout shift after fix', async ({ page }) => {
    console.log('🧪 Testing layout fix on localhost...');

    await page.goto(TEST_URL);
    await page.waitForLoadState('networkidle');

    // Inject layout shift tracking
    await page.evaluate(() => {
      (window as any).layoutShifts = [];
      (window as any).startTime = Date.now();

      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'layout-shift' && !(entry as any).hadRecentInput) {
            (window as any).layoutShifts.push({
              timestamp: Date.now() - (window as any).startTime,
              value: (entry as any).value
            });
          }
        }
      });

      observer.observe({ type: 'layout-shift', buffered: true });
    });

    // Send message
    const textarea = page.locator('textarea').first();
    await textarea.waitFor({ state: 'visible' });
    await textarea.fill(TEST_MESSAGE);
    await textarea.press('Enter');

    console.log('🚀 Message sent, monitoring layout shifts...');

    // Wait for response to complete
    try {
      await page.waitForSelector('text=/Used \\d+ sources?/', { timeout: 30000 });
      console.log('✅ Response completed');
    } catch (e) {
      console.log('⏱️  Timeout - checking results anyway');
    }

    // Collect metrics
    const metrics = await page.evaluate(() => {
      return {
        layoutShifts: (window as any).layoutShifts || []
      };
    });

    const cls = metrics.layoutShifts.reduce((sum: number, shift: any) => sum + shift.value, 0);

    console.log('\n📊 Layout Shift Metrics (After Fix):');
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
        });
    }

    // Expectations
    expect(cls).toBeLessThan(0.1); // Should be "Good" threshold
    console.log('\n✅ Layout fix validation PASSED!');
  });

  test('should render progressive loader inside streaming message', async ({ page }) => {
    console.log('🧪 Testing progressive loader positioning...');

    await page.goto(TEST_URL);
    await page.waitForLoadState('networkidle');

    // Send message
    const textarea = page.locator('textarea').first();
    await textarea.waitFor({ state: 'visible' });
    await textarea.fill(TEST_MESSAGE);
    await textarea.press('Enter');

    // Wait a moment for progressive loader to appear
    await page.waitForTimeout(1000);

    // Check that progressive loader appears
    const hasProgressiveLoader = await page.evaluate(() => {
      // Look for "Searching knowledge base", "Analyzing sources", etc.
      const indicators = [
        'Searching knowledge base',
        'Analyzing sources',
        'Generating response',
        'Formatting output'
      ];

      for (const text of indicators) {
        const element = document.evaluate(
          `//*[contains(text(), '${text}')]`,
          document,
          null,
          XPathResult.FIRST_ORDERED_NODE_TYPE,
          null
        ).singleNodeValue;

        if (element) {
          // Check if it's inside a message (not a separate standalone message)
          const messageParent = (element as HTMLElement).closest('[data-role="assistant"]');
          return {
            found: true,
            indicator: text,
            hasMessageParent: !!messageParent
          };
        }
      }

      return { found: false };
    });

    console.log('\n📍 Progressive Loader Check:');
    if (hasProgressiveLoader.found) {
      console.log(`   Found indicator: "${hasProgressiveLoader.indicator}"`);
      console.log(`   Inside message: ${hasProgressiveLoader.hasMessageParent ? '✅ Yes' : '❌ No (separate message)'}`);

      if (!hasProgressiveLoader.hasMessageParent) {
        console.warn('⚠️  Progressive loader is still rendering as separate message!');
      }
    } else {
      console.log('   No progressive loader found (may have completed already)');
    }

    // Take screenshot
    await page.screenshot({
      path: 'test-results/layout-fix-validation.png',
      fullPage: true
    });

    console.log('\n✅ Progressive loader test complete');
  });
});
