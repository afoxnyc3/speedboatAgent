/**
 * Production Stuttering/Flickering Diagnosis
 *
 * This test captures comprehensive performance data from the live Vercel production
 * deployment to diagnose lag, stutter, and flicker issues during RAG responses.
 *
 * Metrics Captured:
 * - Layout Shifts (CLS - Cumulative Layout Shift)
 * - Long Tasks (JavaScript execution blocking)
 * - Paint timing (First Paint, First Contentful Paint)
 * - React re-renders
 * - SSE stream chunk timing
 * - Scroll behavior and throttling
 * - DOM mutations and reflows
 *
 * Usage:
 * PLAYWRIGHT_BASE_URL=https://speedboat-agent.vercel.app npx playwright test production-stuttering-diagnosis.spec.ts --headed --trace on
 */

import { test, expect, chromium, Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

// Production URL - override with env var if needed
const PRODUCTION_URL = process.env.PLAYWRIGHT_BASE_URL || 'https://speedboat-agent.vercel.app';
const TEST_MESSAGE = 'Explain the RAG system architecture and how hybrid search works. Include technical details about vector embeddings and semantic search.';
const DIAGNOSIS_OUTPUT_DIR = path.join(process.cwd(), 'test-results', 'stuttering-diagnosis');

// Performance metrics types
interface LayoutShiftEntry {
  timestamp: number;
  value: number;
  sources: Array<{
    node: string;
    previousRect: DOMRect;
    currentRect: DOMRect;
  }>;
}

interface LongTaskEntry {
  timestamp: number;
  duration: number;
  attribution?: string;
}

interface PaintEntry {
  timestamp: number;
  name: string;
  startTime: number;
}

interface DOMChange {
  timestamp: number;
  type: 'added' | 'removed' | 'attributes' | 'characterData';
  target: string;
  oldValue?: string;
  newValue?: string;
}

interface ScrollEvent {
  timestamp: number;
  scrollTop: number;
  scrollHeight: number;
  clientHeight: number;
  isAtBottom: boolean;
  delta: number;
}

interface DiagnosticData {
  layoutShifts: LayoutShiftEntry[];
  longTasks: LongTaskEntry[];
  paintTimings: PaintEntry[];
  domChanges: DOMChange[];
  scrollEvents: ScrollEvent[];
  sseChunks: Array<{ timestamp: number; data: string; delta: number }>;
  cumulativeLayoutShift: number;
  totalRenderTime: number;
  messageStartTime: number;
  messageCompleteTime: number;
  stutterEvents: Array<{ timestamp: number; type: string; description: string }>;
}

test.describe('Production Stuttering Diagnosis', () => {
  test.setTimeout(180000); // 3 minutes for comprehensive diagnosis

  test('Capture comprehensive performance metrics during streaming response', async () => {
    console.log('\n🔬 Starting Production Stuttering Diagnosis');
    console.log(`📍 Production URL: ${PRODUCTION_URL}`);
    console.log(`📝 Test Message: ${TEST_MESSAGE}\n`);

    // Ensure output directory exists
    if (!fs.existsSync(DIAGNOSIS_OUTPUT_DIR)) {
      fs.mkdirSync(DIAGNOSIS_OUTPUT_DIR, { recursive: true });
    }

    // Launch browser with Chrome DevTools Protocol enabled
    const browser = await chromium.launch({
      headless: false, // Run headed to visually observe the issue
      args: [
        '--enable-precise-memory-info',
        '--enable-automation',
        '--disable-blink-features=AutomationControlled',
        '--enable-features=LayoutInstabilityAPI',
      ],
      slowMo: 0, // No artificial delay
    });

    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      recordVideo: {
        dir: DIAGNOSIS_OUTPUT_DIR,
        size: { width: 1280, height: 720 }
      },
    });

    // Enable Chrome DevTools Protocol for performance monitoring
    const cdpSession = await context.newCDPSession(await context.pages()[0] || await context.newPage());
    await cdpSession.send('Performance.enable');

    // Note: PerformanceTimeline.enable is not needed since we use in-page PerformanceObserver API
    // which provides all the metrics we need

    const page = await context.newPage();

    console.log('🌐 Navigating to production URL...');
    await page.goto(PRODUCTION_URL, { waitUntil: 'networkidle' });
    console.log('✅ Page loaded\n');

    // Inject comprehensive performance monitoring
    await page.evaluate(() => {
      // Initialize monitoring storage
      (window as any).diagnostics = {
        layoutShifts: [],
        longTasks: [],
        paintTimings: [],
        domChanges: [],
        scrollEvents: [],
        sseChunks: [],
        stutterEvents: [],
        startTime: Date.now(),
        cumulativeLayoutShift: 0,
      };

      const startTime = (window as any).diagnostics.startTime;

      // 1. Layout Shift Observer
      const layoutShiftObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'layout-shift' && !(entry as any).hadRecentInput) {
            const value = (entry as any).value;
            const sources = (entry as any).sources?.map((source: any) => ({
              node: source.node?.tagName || 'unknown',
              previousRect: {
                x: source.previousRect.x,
                y: source.previousRect.y,
                width: source.previousRect.width,
                height: source.previousRect.height
              },
              currentRect: {
                x: source.currentRect.x,
                y: source.currentRect.y,
                width: source.currentRect.width,
                height: source.currentRect.height
              }
            })) || [];

            (window as any).diagnostics.layoutShifts.push({
              timestamp: Date.now() - startTime,
              value,
              sources
            });

            (window as any).diagnostics.cumulativeLayoutShift += value;

            // Log significant layout shifts
            if (value > 0.1) {
              console.warn(`⚠️ LARGE LAYOUT SHIFT: ${value.toFixed(4)} at ${Date.now() - startTime}ms`);
              (window as any).diagnostics.stutterEvents.push({
                timestamp: Date.now() - startTime,
                type: 'layout-shift',
                description: `Large layout shift: ${value.toFixed(4)}`
              });
            }
          }
        }
      });
      layoutShiftObserver.observe({ type: 'layout-shift', buffered: true });

      // 2. Long Task Observer
      const longTaskObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'longtask') {
            const duration = entry.duration;
            (window as any).diagnostics.longTasks.push({
              timestamp: Date.now() - startTime,
              duration,
              attribution: (entry as any).attribution?.[0]?.name || 'unknown'
            });

            if (duration > 50) {
              console.warn(`⚠️ LONG TASK: ${duration.toFixed(2)}ms at ${Date.now() - startTime}ms`);
              (window as any).diagnostics.stutterEvents.push({
                timestamp: Date.now() - startTime,
                type: 'long-task',
                description: `Long task: ${duration.toFixed(2)}ms`
              });
            }
          }
        }
      });
      try {
        longTaskObserver.observe({ type: 'longtask', buffered: true });
      } catch (e) {
        console.log('Long task observer not supported');
      }

      // 3. Paint Timing Observer
      const paintObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'paint') {
            (window as any).diagnostics.paintTimings.push({
              timestamp: Date.now() - startTime,
              name: entry.name,
              startTime: entry.startTime
            });
            console.log(`🎨 ${entry.name}: ${entry.startTime.toFixed(2)}ms`);
          }
        }
      });
      paintObserver.observe({ type: 'paint', buffered: true });

      // 4. DOM Mutation Observer
      const scrollContainer = document.querySelector('.overflow-y-auto.scrollbar-thin') as HTMLElement;
      if (scrollContainer) {
        const mutationObserver = new MutationObserver((mutations) => {
          for (const mutation of mutations) {
            const change: any = {
              timestamp: Date.now() - startTime,
              type: mutation.type as any,
              target: (mutation.target as HTMLElement).tagName || 'unknown'
            };

            if (mutation.type === 'attributes') {
              change.oldValue = mutation.oldValue;
              change.newValue = (mutation.target as HTMLElement).getAttribute(mutation.attributeName!);
            } else if (mutation.type === 'characterData') {
              change.oldValue = mutation.oldValue;
              change.newValue = mutation.target.textContent;
            }

            (window as any).diagnostics.domChanges.push(change);
          }
        });

        mutationObserver.observe(scrollContainer, {
          attributes: true,
          characterData: true,
          childList: true,
          subtree: true,
          attributeOldValue: true,
          characterDataOldValue: true
        });
      }

      // 5. Scroll Event Monitoring
      if (scrollContainer) {
        let lastScrollTop = scrollContainer.scrollTop;
        let scrollCount = 0;

        scrollContainer.addEventListener('scroll', () => {
          scrollCount++;
          const delta = scrollContainer.scrollTop - lastScrollTop;

          const scrollEvent = {
            timestamp: Date.now() - startTime,
            scrollTop: scrollContainer.scrollTop,
            scrollHeight: scrollContainer.scrollHeight,
            clientHeight: scrollContainer.clientHeight,
            isAtBottom: Math.abs(scrollContainer.scrollHeight - scrollContainer.scrollTop - scrollContainer.clientHeight) < 10,
            delta
          };

          (window as any).diagnostics.scrollEvents.push(scrollEvent);

          // Detect rapid scroll changes (stuttering indicator)
          if (Math.abs(delta) > 100 && scrollCount > 2) {
            console.warn(`⚠️ RAPID SCROLL: ${delta}px at ${scrollEvent.timestamp}ms`);
            (window as any).diagnostics.stutterEvents.push({
              timestamp: scrollEvent.timestamp,
              type: 'rapid-scroll',
              description: `Rapid scroll: ${delta}px`
            });
          }

          lastScrollTop = scrollContainer.scrollTop;
        }, { passive: true });
      }

      console.log('✅ Performance monitoring instrumentation installed');
    });

    // Wait for chat interface to be ready
    await expect(page.locator('textarea')).toBeVisible({ timeout: 10000 });
    console.log('✅ Chat interface ready\n');

    // Intercept SSE stream to monitor chunk timing
    const sseChunks: Array<{ timestamp: number; data: string; delta: number }> = [];
    let lastChunkTime = Date.now();

    page.on('response', async response => {
      if (response.url().includes('/api/chat/stream')) {
        console.log('📡 SSE Stream detected, monitoring chunks...\n');

        try {
          const body = await response.body();
          const text = body.toString();
          const lines = text.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const now = Date.now();
              const delta = now - lastChunkTime;

              sseChunks.push({
                timestamp: now - (await page.evaluate(() => (window as any).diagnostics.startTime)),
                data: line.slice(6),
                delta
              });

              if (delta > 200) {
                console.warn(`⚠️ SLOW SSE CHUNK: ${delta}ms gap`);
              }

              lastChunkTime = now;
            }
          }
        } catch (e) {
          console.log('Could not parse SSE response:', e);
        }
      }
    });

    // Mark message start time
    await page.evaluate(() => {
      (window as any).diagnostics.messageStartTime = Date.now() - (window as any).diagnostics.startTime;
    });

    console.log('📝 Sending test message...');
    const textarea = page.locator('textarea').first();
    await textarea.fill(TEST_MESSAGE);
    await textarea.press('Enter');

    console.log('⏳ Monitoring streaming response...\n');

    // Wait for streaming to complete (look for completion indicators)
    await page.waitForSelector('[data-role="assistant"]', { timeout: 60000 });

    // Wait a bit more to capture any post-completion effects
    await page.waitForTimeout(5000);

    // Mark message complete time
    await page.evaluate(() => {
      (window as any).diagnostics.messageCompleteTime = Date.now() - (window as any).diagnostics.startTime;
    });

    console.log('✅ Response received, collecting diagnostic data...\n');

    // Collect all diagnostic data
    const diagnostics = await page.evaluate(() => {
      return (window as any).diagnostics;
    }) as DiagnosticData;

    // Add SSE chunks data
    diagnostics.sseChunks = sseChunks;

    // Calculate summary metrics
    const summary = {
      cumulativeLayoutShift: diagnostics.cumulativeLayoutShift,
      totalLayoutShifts: diagnostics.layoutShifts.length,
      largeLayoutShifts: diagnostics.layoutShifts.filter(s => s.value > 0.1).length,
      totalLongTasks: diagnostics.longTasks.length,
      maxLongTaskDuration: Math.max(...diagnostics.longTasks.map(t => t.duration), 0),
      totalDOMChanges: diagnostics.domChanges.length,
      totalScrollEvents: diagnostics.scrollEvents.length,
      rapidScrollEvents: diagnostics.stutterEvents.filter(e => e.type === 'rapid-scroll').length,
      totalStutterEvents: diagnostics.stutterEvents.length,
      responseTime: diagnostics.messageCompleteTime - diagnostics.messageStartTime,
      sseChunkCount: diagnostics.sseChunks.length,
      avgSSEChunkInterval: diagnostics.sseChunks.length > 0
        ? diagnostics.sseChunks.reduce((sum, c) => sum + c.delta, 0) / diagnostics.sseChunks.length
        : 0,
      maxSSEChunkGap: Math.max(...diagnostics.sseChunks.map(c => c.delta), 0),
    };

    // Save diagnostic data to file
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const outputPath = path.join(DIAGNOSIS_OUTPUT_DIR, `diagnosis-${timestamp}.json`);

    fs.writeFileSync(outputPath, JSON.stringify({
      productionUrl: PRODUCTION_URL,
      testMessage: TEST_MESSAGE,
      timestamp: new Date().toISOString(),
      summary,
      diagnostics
    }, null, 2));

    console.log('📊 DIAGNOSIS SUMMARY');
    console.log('═══════════════════════════════════════\n');
    console.log(`⏱️  Total Response Time: ${summary.responseTime.toFixed(0)}ms`);
    console.log(`📏 Cumulative Layout Shift: ${summary.cumulativeLayoutShift.toFixed(4)} ${summary.cumulativeLayoutShift > 0.1 ? '❌ FAIL' : '✅ PASS'}`);
    console.log(`📊 Total Layout Shifts: ${summary.totalLayoutShifts} (Large: ${summary.largeLayoutShifts})`);
    console.log(`⚡ Long Tasks: ${summary.totalLongTasks} (Max: ${summary.maxLongTaskDuration.toFixed(2)}ms)`);
    console.log(`🔄 DOM Changes: ${summary.totalDOMChanges}`);
    console.log(`📜 Scroll Events: ${summary.totalScrollEvents} (Rapid: ${summary.rapidScrollEvents})`);
    console.log(`🚨 Stutter Events: ${summary.totalStutterEvents}`);
    console.log(`📡 SSE Chunks: ${summary.sseChunkCount} (Avg interval: ${summary.avgSSEChunkInterval.toFixed(0)}ms)`);
    console.log(`\n📁 Full diagnostic data saved to: ${outputPath}\n`);

    // Print top stutter events
    if (diagnostics.stutterEvents.length > 0) {
      console.log('🔍 TOP STUTTER EVENTS:');
      diagnostics.stutterEvents.slice(0, 10).forEach((event, i) => {
        console.log(`   ${i + 1}. [${event.timestamp}ms] ${event.type}: ${event.description}`);
      });
      console.log('');
    }

    // Print largest layout shifts
    if (diagnostics.layoutShifts.length > 0) {
      console.log('📏 LARGEST LAYOUT SHIFTS:');
      const topShifts = diagnostics.layoutShifts
        .sort((a, b) => b.value - a.value)
        .slice(0, 5);

      topShifts.forEach((shift, i) => {
        console.log(`   ${i + 1}. [${shift.timestamp}ms] Value: ${shift.value.toFixed(4)}`);
        shift.sources.forEach(source => {
          console.log(`      - ${source.node}: ${source.previousRect.y} → ${source.currentRect.y} (Δ${(source.currentRect.y - source.previousRect.y).toFixed(0)}px)`);
        });
      });
      console.log('');
    }

    // Assessment
    console.log('🎯 ASSESSMENT:');
    if (summary.cumulativeLayoutShift > 0.25) {
      console.log('   ❌ CRITICAL: Severe layout instability detected');
    } else if (summary.cumulativeLayoutShift > 0.1) {
      console.log('   ⚠️  WARNING: Moderate layout instability detected');
    } else {
      console.log('   ✅ GOOD: Layout stability within acceptable range');
    }

    if (summary.maxLongTaskDuration > 100) {
      console.log('   ❌ CRITICAL: JavaScript blocking main thread significantly');
    } else if (summary.maxLongTaskDuration > 50) {
      console.log('   ⚠️  WARNING: Some JavaScript blocking detected');
    } else {
      console.log('   ✅ GOOD: No significant JavaScript blocking');
    }

    if (summary.maxSSEChunkGap > 500) {
      console.log('   ⚠️  WARNING: Large gaps in SSE stream detected');
    } else {
      console.log('   ✅ GOOD: SSE stream timing consistent');
    }

    console.log('\n═══════════════════════════════════════\n');

    // Close browser
    await context.close();
    await browser.close();

    console.log('✅ Diagnosis complete!\n');
    console.log(`📹 Video recording saved in: ${DIAGNOSIS_OUTPUT_DIR}`);
    console.log(`📊 Open diagnostic data: cat ${outputPath} | jq\n`);

    // Fail test if critical issues detected
    expect(summary.cumulativeLayoutShift, 'CLS should be < 0.25').toBeLessThan(0.25);
    expect(summary.maxLongTaskDuration, 'Max long task should be < 200ms').toBeLessThan(200);
  });
});
