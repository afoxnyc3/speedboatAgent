/**
 * Example unit test file
 * Tests individual functions and components in isolation
 */

describe('Example Unit Test', () => {
  it('should pass a basic test', () => {
    expect(1 + 1).toBe(2);
  });

  it('should test a function', () => {
    const add = (a: number, b: number) => a + b;
    expect(add(2, 3)).toBe(5);
  });

  it('should handle edge cases', () => {
    const divide = (a: number, b: number) => {
      if (b === 0) throw new Error('Division by zero');
      return a / b;
    };

    expect(divide(10, 2)).toBe(5);
    expect(() => divide(10, 0)).toThrow('Division by zero');
  });
});