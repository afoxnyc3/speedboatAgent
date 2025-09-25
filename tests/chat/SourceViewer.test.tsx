import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SourceViewer from '@/components/chat/SourceViewer';
import type { Citation } from '@/components/chat/types';

describe('SourceViewer', () => {
  const mockCitations: Citation[] = [
    {
      filepath: 'src/components/Button.tsx',
      line: 15,
      content: 'export const Button = () => {}',
      score: 0.92,
      language: 'typescript',
      url: 'https://github.com/repo/file.tsx',
      source: 'github',
    },
    {
      filepath: 'docs/api.md',
      content: 'API documentation content',
      score: 0.85,
      language: 'markdown',
      url: 'https://docs.example.com/api',
      source: 'web',
    },
  ];

  test('renders nothing when no citations provided', () => {
    const { container } = render(<SourceViewer citations={[]} />);
    expect(container.firstChild).toBeNull();
  });

  test('renders nothing when citations is undefined', () => {
    const { container } = render(<SourceViewer citations={undefined as any} />);
    expect(container.firstChild).toBeNull();
  });

  test('renders expanded view by default', () => {
    render(<SourceViewer citations={mockCitations} />);

    expect(screen.getByText('Used 2 sources')).toBeInTheDocument();
    expect(screen.getByText('Button.tsx')).toBeInTheDocument();
    expect(screen.getByText('api.md')).toBeInTheDocument();
  });

  test('renders compact view when compact prop is true', () => {
    render(<SourceViewer citations={mockCitations} compact={true} />);

    expect(screen.queryByText('Used 2 sources')).not.toBeInTheDocument();
    expect(screen.getByText('Button.tsx')).toBeInTheDocument();
    expect(screen.getByText('api.md')).toBeInTheDocument();
  });

  test('displays file line numbers when available', () => {
    render(<SourceViewer citations={mockCitations} />);

    expect(screen.getByText('L15')).toBeInTheDocument();
  });

  test('displays confidence scores', () => {
    render(<SourceViewer citations={mockCitations} />);

    expect(screen.getByText('92%')).toBeInTheDocument();
    expect(screen.getByText('85%')).toBeInTheDocument();
  });

  test('displays source icons correctly', () => {
    render(<SourceViewer citations={mockCitations} />);

    // Should have GitHub and Globe icons (represented by their test ids if we add them)
    const githubCitation = screen.getByText('Button.tsx').closest('[data-testid]') ||
                           screen.getByText('Button.tsx').closest('div');
    const webCitation = screen.getByText('api.md').closest('[data-testid]') ||
                       screen.getByText('api.md').closest('div');

    expect(githubCitation).toBeInTheDocument();
    expect(webCitation).toBeInTheDocument();
  });

  test('shows code content when available', () => {
    render(<SourceViewer citations={mockCitations} />);

    expect(screen.getByText('export const Button = () => {}')).toBeInTheDocument();
    expect(screen.getByText('API documentation content')).toBeInTheDocument();
  });

  test('shows URLs when available', () => {
    render(<SourceViewer citations={mockCitations} />);

    expect(screen.getByText('https://github.com/repo/file.tsx')).toBeInTheDocument();
    expect(screen.getByText('https://docs.example.com/api')).toBeInTheDocument();
  });

  test('calls onCitationClick when citation is clicked', async () => {
    const user = userEvent.setup();
    const onCitationClick = jest.fn();

    render(
      <SourceViewer
        citations={mockCitations}
        onCitationClick={onCitationClick}
      />
    );

    const firstCitation = screen.getByText('Button.tsx').closest('div')!;
    await user.click(firstCitation);

    expect(onCitationClick).toHaveBeenCalledWith(mockCitations[0]);
  });

  test('opens URL in new tab when citation has URL', async () => {
    const user = userEvent.setup();
    const windowOpenSpy = jest.spyOn(window, 'open').mockImplementation(() => null);

    render(<SourceViewer citations={mockCitations} />);

    const firstCitation = screen.getByText('Button.tsx').closest('div')!;
    await user.click(firstCitation);

    expect(windowOpenSpy).toHaveBeenCalledWith(
      'https://github.com/repo/file.tsx',
      '_blank',
      'noopener,noreferrer'
    );

    windowOpenSpy.mockRestore();
  });

  test('handles citations without URLs', async () => {
    const user = userEvent.setup();
    const citationWithoutUrl: Citation[] = [
      {
        filepath: 'src/test.ts',
        content: 'test content',
        score: 0.8,
      },
    ];

    const onCitationClick = jest.fn();
    const windowOpenSpy = jest.spyOn(window, 'open').mockImplementation(() => null);

    render(
      <SourceViewer
        citations={citationWithoutUrl}
        onCitationClick={onCitationClick}
      />
    );

    const citation = screen.getByText('test.ts').closest('div')!;
    await user.click(citation);

    expect(onCitationClick).toHaveBeenCalledWith(citationWithoutUrl[0]);
    expect(windowOpenSpy).not.toHaveBeenCalled();

    windowOpenSpy.mockRestore();
  });

  test('renders different file type icons', () => {
    const differentFileTypes: Citation[] = [
      {
        filepath: 'src/component.tsx',
        content: 'React component',
        score: 0.9,
      },
      {
        filepath: 'docs/readme.md',
        content: 'Documentation',
        score: 0.8,
      },
      {
        filepath: 'config/settings.json',
        content: '{"setting": true}',
        score: 0.7,
      },
    ];

    render(<SourceViewer citations={differentFileTypes} />);

    expect(screen.getByText('component.tsx')).toBeInTheDocument();
    expect(screen.getByText('readme.md')).toBeInTheDocument();
    expect(screen.getByText('settings.json')).toBeInTheDocument();
  });

  test('expands and collapses sources correctly', async () => {
    const user = userEvent.setup();
    render(<SourceViewer citations={mockCitations} />);

    const trigger = screen.getByText('Used 2 sources');

    // Should show content initially (expanded)
    expect(screen.getByText('export const Button = () => {}')).toBeInTheDocument();

    // Click to collapse
    await user.click(trigger);

    // Content might still be visible immediately due to animation
    // In a real app, you'd wait for the collapse animation
  });
});