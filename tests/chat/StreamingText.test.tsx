import { render, screen, waitFor } from '@testing-library/react';
import StreamingText from '@/components/chat/StreamingText';

describe('StreamingText', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('renders empty initially', () => {
    render(<StreamingText text="Hello world" speed={100} />);

    const container = screen.getByText('').parentElement;
    expect(container).toBeInTheDocument();
  });

  test('animates text character by character', async () => {
    const onComplete = jest.fn();
    render(
      <StreamingText
        text="Hi"
        speed={100}
        onComplete={onComplete}
      />
    );

    // Initially empty
    expect(screen.queryByText('Hi')).not.toBeInTheDocument();

    // After first interval
    jest.advanceTimersByTime(100);
    await waitFor(() => {
      expect(screen.getByText('H')).toBeInTheDocument();
    });

    // After second interval
    jest.advanceTimersByTime(100);
    await waitFor(() => {
      expect(screen.getByText('Hi')).toBeInTheDocument();
    });

    // Should call onComplete when done
    jest.advanceTimersByTime(100);
    await waitFor(() => {
      expect(onComplete).toHaveBeenCalled();
    });
  });

  test('shows cursor when enabled', () => {
    render(<StreamingText text="Test" showCursor={true} />);

    const cursor = document.querySelector('[aria-hidden="true"]');
    expect(cursor).toBeInTheDocument();
    expect(cursor).toHaveClass('animate-pulse');
  });

  test('hides cursor when disabled', () => {
    render(<StreamingText text="Test" showCursor={false} />);

    const cursor = document.querySelector('[aria-hidden="true"]');
    expect(cursor).not.toBeInTheDocument();
  });

  test('hides cursor when animation completes', async () => {
    render(<StreamingText text="Hi" speed={50} showCursor={true} />);

    // Complete the animation
    jest.advanceTimersByTime(150);

    await waitFor(() => {
      const cursor = document.querySelector('[aria-hidden="true"]');
      expect(cursor).not.toBeInTheDocument();
    });
  });

  test('handles empty text', () => {
    const onComplete = jest.fn();
    render(<StreamingText text="" onComplete={onComplete} />);

    expect(screen.getByText('')).toBeInTheDocument();
    expect(onComplete).not.toHaveBeenCalled();
  });

  test('respects custom speed', async () => {
    render(<StreamingText text="ABC" speed={200} />);

    // Should not show anything initially
    expect(screen.queryByText('A')).not.toBeInTheDocument();

    // After first 200ms interval
    jest.advanceTimersByTime(200);
    await waitFor(() => {
      expect(screen.getByText('A')).toBeInTheDocument();
    });

    // After second 200ms interval
    jest.advanceTimersByTime(200);
    await waitFor(() => {
      expect(screen.getByText('AB')).toBeInTheDocument();
    });
  });

  test('resets animation when text changes', async () => {
    const { rerender } = render(<StreamingText text="First" speed={100} />);

    // Start first animation
    jest.advanceTimersByTime(100);
    await waitFor(() => {
      expect(screen.getByText('F')).toBeInTheDocument();
    });

    // Change text
    rerender(<StreamingText text="Second" speed={100} />);

    // Should start over with new text
    jest.advanceTimersByTime(100);
    await waitFor(() => {
      expect(screen.queryByText('F')).not.toBeInTheDocument();
      expect(screen.getByText('S')).toBeInTheDocument();
    });
  });
});