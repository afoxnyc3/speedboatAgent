#!/usr/bin/env node

import { chromium } from 'playwright';

async function testCompanyDataAccess() {
  console.log('🔍 Starting company data access test...\n');

  const browser = await chromium.launch({
    headless: false, // Run with UI to see the glitch
    slowMo: 100 // Slow down to observe behavior
  });

  const context = await browser.newContext({
    // Record video for analysis
    recordVideo: {
      dir: '/tmp/test-videos'
    }
  });

  const page = await context.newPage();

  // Track network failures and reloads
  const networkIssues = [];
  const pageReloads = [];
  let initialLoad = true;

  // Monitor network failures
  page.on('requestfailed', request => {
    networkIssues.push({
      url: request.url(),
      failure: request.failure(),
      timestamp: new Date().toISOString()
    });
    console.log(`❌ Request failed: ${request.url()}`);
    console.log(`   Reason: ${request.failure()?.errorText}`);
  });

  // Monitor page navigation/reloads
  page.on('load', () => {
    if (!initialLoad) {
      pageReloads.push({
        timestamp: new Date().toISOString(),
        url: page.url()
      });
      console.log('⚠️  Page reloaded unexpectedly!');
    }
    initialLoad = false;
  });

  // Monitor console errors
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log(`🔴 Console error: ${msg.text()}`);
    }
  });

  try {
    // Navigate to the app
    console.log('📱 Navigating to http://localhost:3000...');
    await page.goto('http://localhost:3000', {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    // Wait for chat interface
    await page.waitForSelector('[data-testid="prompt-input"], textarea', {
      timeout: 10000
    });
    console.log('✅ Chat interface loaded\n');

    // Test 1: Query about company-specific content
    console.log('🧪 Test 1: Querying company-specific content...');
    const companyQuery = 'What is the Button component in the company website?';

    const input = await page.locator('[data-testid="prompt-input"], textarea').first();
    await input.fill(companyQuery);
    console.log(`   Query: "${companyQuery}"`);

    // Monitor for glitches during submission
    console.log('   Submitting query...');
    const beforeSubmit = Date.now();

    // Set up promises to detect various states
    const searchingPromise = page.waitForSelector(
      'text=/searching|Searching|SEARCHING/i',
      { timeout: 5000 }
    ).catch(() => null);

    const glitchPromise = page.waitForFunction(
      () => {
        // Check for visual glitches
        const body = document.body;
        return body.style.opacity === '0' ||
               body.classList.contains('loading') ||
               document.querySelector('.error-boundary-triggered');
      },
      { timeout: 5000 }
    ).catch(() => null);

    await page.keyboard.press('Enter');

    // Wait for any of the states
    const [searching, glitch] = await Promise.all([
      searchingPromise,
      glitchPromise
    ]);

    if (searching) {
      console.log('   ✅ Search initiated');
      const searchTime = Date.now() - beforeSubmit;
      console.log(`   Search started after: ${searchTime}ms`);
    }

    if (glitch) {
      console.log('   ⚠️  Visual glitch detected!');
    }

    // Wait for response with longer timeout
    console.log('   Waiting for response...');
    const responsePromise = page.waitForSelector(
      '.assistant-message, [role="article"], div:has-text("Based on")',
      { timeout: 30000 }
    );

    const response = await responsePromise.catch(() => null);

    if (response) {
      console.log('   ✅ Response received');

      // Check response content
      const responseText = await response.textContent();
      console.log(`   Response preview: ${responseText?.substring(0, 100)}...`);

      // Check for sources
      const sources = await page.$$('[data-testid="source-citation"], .source-link, a[href*="github"]');
      console.log(`   Sources found: ${sources.length}`);

      if (sources.length > 0) {
        console.log('   ✅ Sources with citations found');

        // Check if sources point to company repo
        for (const source of sources.slice(0, 3)) {
          const href = await source.getAttribute('href');
          if (href?.includes('company')) {
            console.log(`   ✅ Company source found: ${href}`);
          }
        }
      } else {
        console.log('   ❌ No source citations found');
      }

      // Check if response mentions company-specific content
      if (responseText?.toLowerCase().includes('button') ||
          responseText?.toLowerCase().includes('component')) {
        console.log('   ✅ Response contains relevant company content');
      } else {
        console.log('   ⚠️  Response may not contain company-specific content');
      }
    } else {
      console.log('   ❌ No response received within timeout');
    }

    // Test 2: Check for data availability
    console.log('\n🧪 Test 2: Testing another company query...');

    // Clear input and try another query
    await input.clear();
    const secondQuery = 'Show me the eslint configuration';
    await input.fill(secondQuery);
    console.log(`   Query: "${secondQuery}"`);

    await page.keyboard.press('Enter');

    // Wait for second response
    const secondResponse = await page.waitForSelector(
      '.assistant-message:nth-of-type(2), [role="article"]:nth-of-type(2)',
      { timeout: 15000 }
    ).catch(() => null);

    if (secondResponse) {
      const responseText = await secondResponse.textContent();
      console.log('   ✅ Second response received');

      if (responseText?.includes('eslint') || responseText?.includes('config')) {
        console.log('   ✅ Response addresses eslint configuration');
      } else {
        console.log('   ⚠️  Response may not be relevant to query');
      }
    }

    // Analysis Summary
    console.log('\n📊 Test Summary:');
    console.log(`   Network failures: ${networkIssues.length}`);
    console.log(`   Page reloads: ${pageReloads.length}`);

    if (networkIssues.length > 0) {
      console.log('\n   Failed requests:');
      networkIssues.forEach(issue => {
        console.log(`     - ${issue.url}`);
        console.log(`       ${issue.failure?.errorText}`);
      });
    }

    if (pageReloads.length > 0) {
      console.log('\n   ⚠️  Page reloaded during interaction!');
      console.log('   This is the glitch that needs to be fixed.');
    }

    // Take screenshots
    await page.screenshot({
      path: '/tmp/company-data-test-final.png',
      fullPage: true
    });
    console.log('\n📸 Screenshot saved to /tmp/company-data-test-final.png');

    // Save video path
    const video = page.video();
    if (video) {
      const videoPath = await video.path();
      console.log(`📹 Video saved to ${videoPath}`);
    }

    // Determine test result
    const testPassed = networkIssues.length === 0 &&
                       pageReloads.length === 0 &&
                       response !== null;

    if (testPassed) {
      console.log('\n✅ TEST PASSED: Company data is accessible without glitches');
      process.exit(0);
    } else {
      console.log('\n❌ TEST FAILED: Issues detected with company data access');
      process.exit(1);
    }

  } catch (error) {
    console.error('\n❌ Test error:', error);

    // Take error screenshot
    await page.screenshot({
      path: '/tmp/company-data-test-error.png',
      fullPage: true
    });
    console.log('📸 Error screenshot saved to /tmp/company-data-test-error.png');

    process.exit(1);

  } finally {
    await context.close();
    await browser.close();
  }
}

// Run the test
testCompanyDataAccess().catch(console.error);