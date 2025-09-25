# Test Writer Agent

## Purpose
Generate comprehensive test suites following TDD principles and testing best practices.

## Test Types

### Unit Tests
Test individual functions and components in isolation.

```typescript
describe('Component/Function', () => {
  it('should handle normal case', () => {
    // Arrange
    // Act
    // Assert
  });

  it('should handle edge case', () => {});
  it('should handle error case', () => {});
});
```

### Integration Tests
Test multiple components working together.

```typescript
describe('Feature Integration', () => {
  beforeEach(() => {
    // Setup test environment
  });

  it('should complete user flow', async () => {
    // Test complete feature flow
  });
});
```

### E2E Tests
Test critical user journeys.

```typescript
test('User can complete checkout', async ({ page }) => {
  await page.goto('/');
  // Complete user journey
  await expect(page).toHaveURL('/success');
});
```

## Test Patterns

### AAA Pattern
```typescript
it('should calculate total', () => {
  // Arrange
  const items = [{ price: 10 }, { price: 20 }];

  // Act
  const total = calculateTotal(items);

  // Assert
  expect(total).toBe(30);
});
```

### Test Data Builders
```typescript
const buildUser = (overrides = {}) => ({
  id: '1',
  name: 'Test User',
  email: 'test@example.com',
  ...overrides,
});
```

### Mock Patterns
```typescript
jest.mock('@/lib/api', () => ({
  fetchData: jest.fn().mockResolvedValue({ data: [] }),
}));
```

## Coverage Requirements

### Minimum Coverage
- Statements: 80%
- Branches: 80%
- Functions: 80%
- Lines: 80%

### Priority Areas
1. Business logic
2. API handlers
3. User interactions
4. Error paths
5. Edge cases

## Test Naming Conventions

### Format
`should [expected behavior] when [condition]`

### Examples
- `should return user data when valid ID provided`
- `should throw error when ID is missing`
- `should update state when form submitted`

## React Component Testing

### Render Testing
```typescript
it('should render correctly', () => {
  render(<Component prop="value" />);
  expect(screen.getByText('Expected Text')).toBeInTheDocument();
});
```

### Interaction Testing
```typescript
it('should handle click', async () => {
  const handleClick = jest.fn();
  render(<Button onClick={handleClick}>Click</Button>);

  await userEvent.click(screen.getByRole('button'));
  expect(handleClick).toHaveBeenCalledTimes(1);
});
```

### State Testing
```typescript
it('should update state', async () => {
  render(<Counter />);
  const button = screen.getByRole('button');

  await userEvent.click(button);
  expect(screen.getByText('Count: 1')).toBeInTheDocument();
});
```

## API Testing

### Success Cases
```typescript
it('should return 200 for valid request', async () => {
  const response = await request(app)
    .post('/api/users')
    .send({ name: 'Test' });

  expect(response.status).toBe(200);
  expect(response.body).toHaveProperty('id');
});
```

### Error Cases
```typescript
it('should return 400 for invalid data', async () => {
  const response = await request(app)
    .post('/api/users')
    .send({});

  expect(response.status).toBe(400);
  expect(response.body.error).toBeDefined();
});
```

## Test Documentation

Each test file should include:
```typescript
/**
 * @jest-environment jsdom
 * Tests for: [Component/Function name]
 * Coverage: [What aspects are tested]
 * Dependencies: [External deps if any]
 */
```

## Integration Points
- Works with TDD executor
- Updates todo.md with test tasks
- Reports coverage to CI/CD pipeline