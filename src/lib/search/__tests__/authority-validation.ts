/**
 * Authority Weighting System Validation
 * Manual validation of enhanced weighting calculations
 */

import {
  calculateEnhancedWeight,
  generateEnhancedSourceWeights,
  explainWeightCalculation,
  type WeightingContext
} from '../enhanced-authority-weighting';

/**
 * Validate enhanced authority weighting calculations
 */
export function validateAuthorityWeighting(): {
  success: boolean;
  results: Array<{ test: string; result: any; expected?: any; passed: boolean }>;
} {
  const results: Array<{ test: string; result: any; expected?: any; passed: boolean }> = [];

  // Test 1: Basic technical query with GitHub
  const test1Context: WeightingContext = {
    queryType: 'technical',
    sourceType: 'github'
  };
  const test1Result = calculateEnhancedWeight(test1Context);
  results.push({
    test: 'Technical GitHub base weight',
    result: test1Result,
    expected: 1.5,
    passed: test1Result === 1.5
  });

  // Test 2: Technical query with primary authority
  const test2Context: WeightingContext = {
    queryType: 'technical',
    sourceType: 'github',
    authority: 'primary'
  };
  const test2Result = calculateEnhancedWeight(test2Context);
  results.push({
    test: 'Technical GitHub with primary authority',
    result: test2Result,
    expected: 2.25, // 1.5 * 1.5
    passed: Math.abs(test2Result - 2.25) < 0.001
  });

  // Test 3: Business query with web source
  const test3Context: WeightingContext = {
    queryType: 'business',
    sourceType: 'web',
    authority: 'authoritative'
  };
  const test3Result = calculateEnhancedWeight(test3Context);
  results.push({
    test: 'Business web with authoritative authority',
    result: test3Result,
    expected: 1.8, // 1.5 * 1.2
    passed: Math.abs(test3Result - 1.8) < 0.001
  });

  // Test 4: Code content bonus
  const test4Context: WeightingContext = {
    queryType: 'technical',
    sourceType: 'github',
    authority: 'primary',
    contentType: 'code'
  };
  const test4Result = calculateEnhancedWeight(test4Context);
  results.push({
    test: 'Technical GitHub primary with code bonus',
    result: test4Result,
    expected: 2.475, // 1.5 * 1.5 * 1.1
    passed: Math.abs(test4Result - 2.475) < 0.001
  });

  // Test 5: Enhanced source weights generation
  const test5Result = generateEnhancedSourceWeights('technical', {
    github: 'primary',
    web: 'supplementary'
  });
  results.push({
    test: 'Enhanced source weights generation',
    result: `github: ${test5Result.github}, web: ${test5Result.web}`,
    expected: 'github: 2.25, web: 0.4',
    passed: Math.abs(test5Result.github - 2.25) < 0.001 && Math.abs(test5Result.web - 0.4) < 0.001
  });

  // Test 6: Weight explanation
  const test6Context: WeightingContext = {
    queryType: 'technical',
    sourceType: 'github',
    authority: 'primary',
    contentType: 'code'
  };
  const test6Result = explainWeightCalculation(test6Context);
  results.push({
    test: 'Weight calculation explanation',
    result: test6Result.explanation,
    passed: test6Result.finalWeight === 2.475 && test6Result.explanation.includes('Query type: technical')
  });

  const allPassed = results.every(r => r.passed);

  return {
    success: allPassed,
    results
  };
}

/**
 * Run validation and log results
 */
if (require.main === module) {
  console.log('🧪 Validating Enhanced Authority Weighting System...\n');

  const validation = validateAuthorityWeighting();

  validation.results.forEach(result => {
    const status = result.passed ? '✅' : '❌';
    console.log(`${status} ${result.test}`);
    console.log(`   Result: ${result.result}`);
    if (result.expected) {
      console.log(`   Expected: ${result.expected}`);
    }
    console.log();
  });

  if (validation.success) {
    console.log('🎉 All validation tests passed!');
  } else {
    console.log('💥 Some validation tests failed!');
    process.exit(1);
  }
}