import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ChatInterface from '@/components/chat/ChatInterface';
import { mockChatData } from '@/components/chat/mockData';
import type { ChatMessage } from '@/components/chat/types';

// Mock react-syntax-highlighter to avoid issues in test environment
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

describe('ChatInterface', () => {
  const defaultProps = {
    onSendMessage: jest.fn(),
    messages: [],
    isLoading: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders empty state when no messages', () => {
    render(<ChatInterface {...defaultProps} />);

    expect(screen.getByText('RAG Assistant Ready')).toBeInTheDocument();
    expect(screen.getByText(/Ask questions about the codebase/)).toBeInTheDocument();
  });

  test('renders messages correctly', () => {
    const messages: ChatMessage[] = [
      {
        id: '1',
        role: 'user',
        content: 'Test user message',
        timestamp: new Date(),
      },
      {
        id: '2',
        role: 'assistant',
        content: 'Test assistant response',
        timestamp: new Date(),
      },
    ];

    render(<ChatInterface {...defaultProps} messages={messages} />);

    expect(screen.getByText('Test user message')).toBeInTheDocument();
    expect(screen.getByText('Test assistant response')).toBeInTheDocument();
  });

  test('calls onSendMessage when form is submitted', async () => {
    const user = userEvent.setup();
    const onSendMessage = jest.fn();

    render(<ChatInterface {...defaultProps} onSendMessage={onSendMessage} />);

    const textarea = screen.getByPlaceholderText(/Ask about the codebase/);
    const submitButton = screen.getByRole('button', { name: /submit/i });

    await user.type(textarea, 'Test message');
    await user.click(submitButton);

    expect(onSendMessage).toHaveBeenCalledWith('Test message');
  });

  test('does not submit empty messages', async () => {
    const user = userEvent.setup();
    const onSendMessage = jest.fn();

    render(<ChatInterface {...defaultProps} onSendMessage={onSendMessage} />);

    const submitButton = screen.getByRole('button', { name: /submit/i });
    await user.click(submitButton);

    expect(onSendMessage).not.toHaveBeenCalled();
  });

  test('shows loading state correctly', () => {
    render(<ChatInterface {...defaultProps} isLoading={true} />);

    expect(screen.getByText('Searching knowledge base...')).toBeInTheDocument();
    expect(screen.getByText('Processing...')).toBeInTheDocument();
  });

  test('displays error messages', () => {
    const error = 'Test error message';
    render(<ChatInterface {...defaultProps} error={error} />);

    expect(screen.getByText(error)).toBeInTheDocument();
  });

  test('renders timestamps when enabled', () => {
    const messages: ChatMessage[] = [
      {
        id: '1',
        role: 'user',
        content: 'Test message',
        timestamp: new Date('2024-01-01T12:00:00Z'),
      },
    ];

    render(<ChatInterface {...defaultProps} messages={messages} showTimestamps={true} />);

    expect(screen.getByText('12:00 PM')).toBeInTheDocument();
  });

  test('renders source citations', () => {
    const messagesWithSources: ChatMessage[] = [
      {
        id: '1',
        role: 'assistant',
        content: 'Here is the answer',
        timestamp: new Date(),
        sources: [
          {
            filepath: 'src/test.ts',
            content: 'test code',
            score: 0.9,
            language: 'typescript',
          },
        ],
      },
    ];

    render(<ChatInterface {...defaultProps} messages={messagesWithSources} />);

    expect(screen.getByText('Used 1 sources')).toBeInTheDocument();
  });

  test('handles code blocks in messages', () => {
    const messageWithCode: ChatMessage[] = [
      {
        id: '1',
        role: 'assistant',
        content: 'Here is some code:\n\n```typescript\nconst test = "hello";\n```',
        timestamp: new Date(),
      },
    ];

    render(<ChatInterface {...defaultProps} messages={messageWithCode} />);

    expect(screen.getByTestId('syntax-highlighter')).toBeInTheDocument();
  });

  test('prevents submission when loading', async () => {
    const user = userEvent.setup();
    const onSendMessage = jest.fn();

    render(
      <ChatInterface
        {...defaultProps}
        onSendMessage={onSendMessage}
        isLoading={true}
      />
    );

    const textarea = screen.getByPlaceholderText(/Ask about the codebase/);
    await user.type(textarea, 'Test message');

    const submitButton = screen.getByRole('button', { name: /submit/i });
    await user.click(submitButton);

    expect(onSendMessage).not.toHaveBeenCalled();
  });

  test('handles streaming messages', () => {
    const streamingMessage: ChatMessage[] = [
      {
        id: '1',
        role: 'assistant',
        content: 'Streaming response',
        timestamp: new Date(),
        streaming: true,
      },
    ];

    render(<ChatInterface {...defaultProps} messages={streamingMessage} showTimestamps={true} />);

    expect(screen.getByText('Streaming')).toBeInTheDocument();
  });

  test('applies max height constraint', () => {
    const { container } = render(
      <ChatInterface {...defaultProps} maxHeight="400px" />
    );

    const chatContainer = container.firstChild as HTMLElement;
    expect(chatContainer).toHaveStyle('max-height: 400px');
  });

  test('handles Enter key submission', async () => {
    const user = userEvent.setup();
    const onSendMessage = jest.fn();

    render(<ChatInterface {...defaultProps} onSendMessage={onSendMessage} />);

    const textarea = screen.getByPlaceholderText(/Ask about the codebase/);

    await user.type(textarea, 'Test message');
    await user.keyboard('{Enter}');

    expect(onSendMessage).toHaveBeenCalledWith('Test message');
  });
});