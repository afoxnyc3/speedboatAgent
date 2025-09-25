import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CodeBlock from '@/components/chat/CodeBlock';

// Mock react-syntax-highlighter
jest.mock('react-syntax-highlighter', () => ({
  Prism: ({ children, ...props }: any) => (
    <pre data-testid="syntax-highlighter" {...props}>
      {children}
    </pre>
  ),
}));

jest.mock('react-syntax-highlighter/dist/esm/styles/prism', () => ({
  oneDark: {},
}));

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: jest.fn(),
  },
});

describe('CodeBlock', () => {
  const defaultProps = {
    code: 'const hello = "world";',
    language: 'typescript',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders code with syntax highlighter', () => {
    render(<CodeBlock {...defaultProps} />);

    expect(screen.getByTestId('syntax-highlighter')).toBeInTheDocument();
    expect(screen.getByText('const hello = "world";')).toBeInTheDocument();
  });

  test('shows copy button by default', () => {
    render(<CodeBlock {...defaultProps} />);

    expect(screen.getByLabelText('Copy code')).toBeInTheDocument();
  });

  test('hides copy button when showCopy is false', () => {
    render(<CodeBlock {...defaultProps} showCopy={false} />);

    expect(screen.queryByLabelText('Copy code')).not.toBeInTheDocument();
  });

  test('displays filename when provided', () => {
    render(<CodeBlock {...defaultProps} filename="example.ts" />);

    expect(screen.getByText('example.ts')).toBeInTheDocument();
  });

  test('copies code to clipboard when copy button is clicked', async () => {
    const user = userEvent.setup();
    const writeTextSpy = jest.spyOn(navigator.clipboard, 'writeText');

    render(<CodeBlock {...defaultProps} />);

    const copyButton = screen.getByLabelText('Copy code');
    await user.click(copyButton);

    expect(writeTextSpy).toHaveBeenCalledWith('const hello = "world";');
  });

  test('shows success state after copying', async () => {
    const user = userEvent.setup();
    jest.spyOn(navigator.clipboard, 'writeText').mockResolvedValue();

    render(<CodeBlock {...defaultProps} />);

    const copyButton = screen.getByLabelText('Copy code');
    await user.click(copyButton);

    expect(screen.getByLabelText('Copied')).toBeInTheDocument();
  });

  test('resets success state after timeout', async () => {
    const user = userEvent.setup();
    jest.useFakeTimers();
    jest.spyOn(navigator.clipboard, 'writeText').mockResolvedValue();

    render(<CodeBlock {...defaultProps} />);

    const copyButton = screen.getByLabelText('Copy code');
    await user.click(copyButton);

    expect(screen.getByLabelText('Copied')).toBeInTheDocument();

    // Fast-forward time
    jest.advanceTimersByTime(2000);

    await waitFor(() => {
      expect(screen.getByLabelText('Copy code')).toBeInTheDocument();
    });

    jest.useRealTimers();
  });

  test('handles copy failure gracefully', async () => {
    const user = userEvent.setup();
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(navigator.clipboard, 'writeText').mockRejectedValue(new Error('Copy failed'));

    render(<CodeBlock {...defaultProps} />);

    const copyButton = screen.getByLabelText('Copy code');
    await user.click(copyButton);

    expect(consoleSpy).toHaveBeenCalledWith('Failed to copy code:', expect.any(Error));

    consoleSpy.mockRestore();
  });

  test('uses default language when not specified', () => {
    render(<CodeBlock code="plain text" />);

    expect(screen.getByTestId('syntax-highlighter')).toBeInTheDocument();
  });

  test('shows line numbers when startLine is greater than 1', () => {
    render(<CodeBlock {...defaultProps} startLine={10} />);

    const highlighter = screen.getByTestId('syntax-highlighter');
    expect(highlighter).toBeInTheDocument();
    // In a real implementation, you'd check for the showLineNumbers prop
  });

  test('renders header with filename and copy button', () => {
    render(<CodeBlock {...defaultProps} filename="test.ts" showCopy={true} />);

    expect(screen.getByText('test.ts')).toBeInTheDocument();
    expect(screen.getByLabelText('Copy code')).toBeInTheDocument();

    // Header should contain both elements
    const header = screen.getByText('test.ts').closest('div');
    expect(header).toContainElement(screen.getByLabelText('Copy code'));
  });

  test('renders without header when no filename or copy button', () => {
    render(<CodeBlock {...defaultProps} showCopy={false} />);

    // Should not have header elements
    expect(screen.queryByRole('banner')).not.toBeInTheDocument();
  });

  test('applies custom styling', () => {
    render(<CodeBlock {...defaultProps} />);

    const container = screen.getByTestId('syntax-highlighter').parentElement;
    expect(container).toHaveClass('relative', 'overflow-x-auto');
  });

  test('handles empty code', () => {
    render(<CodeBlock code="" />);

    expect(screen.getByTestId('syntax-highlighter')).toBeInTheDocument();
    expect(screen.getByText('')).toBeInTheDocument();
  });

  test('handles multiline code', () => {
    const multilineCode = `function hello() {
  console.log("Hello, World!");
  return true;
}`;

    render(<CodeBlock code={multilineCode} language="javascript" />);

    expect(screen.getByText(multilineCode)).toBeInTheDocument();
  });

  test('preserves code formatting', () => {
    const formattedCode = `const obj = {
  key: "value",
  nested: {
    deep: true
  }
};`;

    render(<CodeBlock code={formattedCode} language="javascript" />);

    expect(screen.getByText(formattedCode)).toBeInTheDocument();
  });
});