/**
 * Sentry Testing Component
 * Client-side error testing and validation for Sentry integration
 */

'use client';

import React, { useState } from 'react';
import * as Sentry from '@sentry/nextjs';

interface TestResult {
  type: string;
  success: boolean;
  message: string;
  timestamp: string;
}

export const SentryTestComponent: React.FC = () => {
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const addTestResult = (type: string, success: boolean, message: string) => {
    const result: TestResult = {
      type,
      success,
      message,
      timestamp: new Date().toLocaleTimeString()
    };
    setTestResults(prev => [result, ...prev.slice(0, 9)]); // Keep last 10 results
  };

  const testClientError = () => {
    try {
      // Set user context for testing
      Sentry.setUser({
        id: 'client-test-user',
        email: 'client-test@example.com',
        username: 'client_tester'
      });

      // Add custom context
      Sentry.setContext('client_test', {
        component: 'SentryTestComponent',
        action: 'manual_error_test',
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent
      });

      // Add tags
      Sentry.setTag('test_type', 'client_error');
      Sentry.setTag('environment', 'test');

      // Throw test error
      throw new Error('Test client-side error - this is intentional for Sentry validation');

    } catch (error) {
      // Capture the error
      Sentry.captureException(error);
      addTestResult('Client Error', true, 'Error captured and sent to Sentry');
      console.error('Client test error (sent to Sentry):', error);
    }
  };

  const testServerError = async (errorType: string = 'general') => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/test-sentry?type=${errorType}`);
      const data = await response.json();

      if (response.ok) {
        addTestResult(`Server ${errorType}`, true, data.message);
      } else {
        addTestResult(`Server ${errorType}`, true, 'Server error captured by Sentry');
      }
    } catch (error) {
      addTestResult(`Server ${errorType}`, false, 'Failed to test server error');
      console.error('Server test error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const testAsyncError = async () => {
    try {
      // Set context for async operation
      Sentry.setContext('async_operation', {
        type: 'promise_rejection',
        component: 'SentryTestComponent'
      });

      // Test unhandled promise rejection
      const promise = new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error('Test unhandled promise rejection'));
        }, 100);
      });

      await promise;

    } catch (error) {
      Sentry.captureException(error);
      addTestResult('Async Error', true, 'Promise rejection captured');
    }
  };

  const testPerformanceMonitoring = async () => {
    // Start a custom span using the new API
    await Sentry.startSpan({
      name: 'SentryTestComponent.performanceTest',
      op: 'test_operation'
    }, async (span) => {
      try {
        // Simulate slow operation
        await Sentry.startSpan({
          op: 'slow_operation',
          name: 'Simulated slow API call'
        }, async () => {
          await new Promise(resolve => setTimeout(resolve, 1000));
        });

        addTestResult('Performance', true, 'Performance transaction recorded');
      } catch (error) {
        span.setStatus({ code: 2, message: 'internal_error' });
        Sentry.captureException(error);
        addTestResult('Performance', false, 'Performance test failed');
      }
    });
  };

  const testBreadcrumbs = () => {
    // Add custom breadcrumbs
    Sentry.addBreadcrumb({
      message: 'User clicked breadcrumb test button',
      category: 'ui.click',
      level: 'info',
      data: {
        component: 'SentryTestComponent',
        timestamp: new Date().toISOString()
      }
    });

    Sentry.addBreadcrumb({
      message: 'Starting breadcrumb navigation simulation',
      category: 'navigation',
      level: 'info'
    });

    // Trigger an error to see breadcrumbs in context
    try {
      throw new Error('Test error with custom breadcrumbs');
    } catch (error) {
      Sentry.captureException(error);
      addTestResult('Breadcrumbs', true, 'Error with breadcrumbs captured');
    }
  };

  const clearResults = () => {
    setTestResults([]);
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-lg border">
      <h2 className="text-xl font-bold mb-4 text-gray-800">🔍 Sentry Integration Testing</h2>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
        <button
          onClick={testClientError}
          className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
          disabled={isLoading}
        >
          Test Client Error
        </button>

        <button
          onClick={() => testServerError('server')}
          className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 transition-colors"
          disabled={isLoading}
        >
          Test Server Error
        </button>

        <button
          onClick={() => testServerError('async')}
          className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 transition-colors"
          disabled={isLoading}
        >
          Test Async Error
        </button>

        <button
          onClick={testAsyncError}
          className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 transition-colors"
          disabled={isLoading}
        >
          Test Promise Error
        </button>

        <button
          onClick={testPerformanceMonitoring}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          disabled={isLoading}
        >
          Test Performance
        </button>

        <button
          onClick={testBreadcrumbs}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
          disabled={isLoading}
        >
          Test Breadcrumbs
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
        <button
          onClick={() => testServerError('database')}
          className="px-3 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors text-sm"
          disabled={isLoading}
        >
          DB Error
        </button>

        <button
          onClick={() => testServerError('openai')}
          className="px-3 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors text-sm"
          disabled={isLoading}
        >
          OpenAI Error
        </button>

        <button
          onClick={() => testServerError('performance')}
          className="px-3 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors text-sm"
          disabled={isLoading}
        >
          Slow Response
        </button>
      </div>

      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-700">Test Results</h3>
        <button
          onClick={clearResults}
          className="px-3 py-1 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 transition-colors text-sm"
        >
          Clear
        </button>
      </div>

      <div className="max-h-64 overflow-y-auto bg-gray-50 rounded p-3">
        {testResults.length === 0 ? (
          <p className="text-gray-500 text-sm">No tests run yet. Click buttons above to test Sentry integration.</p>
        ) : (
          testResults.map((result, index) => (
            <div
              key={index}
              className={`mb-2 p-2 rounded text-sm ${
                result.success
                  ? 'bg-green-100 text-green-800 border border-green-200'
                  : 'bg-red-100 text-red-800 border border-red-200'
              }`}
            >
              <div className="flex justify-between items-start">
                <span className="font-medium">{result.type}</span>
                <span className="text-xs opacity-75">{result.timestamp}</span>
              </div>
              <div className="mt-1 text-xs">{result.message}</div>
            </div>
          ))
        )}
      </div>

      {isLoading && (
        <div className="mt-3 flex items-center text-blue-600">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
          <span className="text-sm">Testing in progress...</span>
        </div>
      )}

      <div className="mt-4 text-xs text-gray-500">
        ℹ️ All errors are captured and sent to Sentry dashboard. Check your Sentry project to see results.
      </div>
    </div>
  );
};