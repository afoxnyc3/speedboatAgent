/**
 * TypeScript interfaces for RAG Chat Components
 * Defines contracts for enhanced chat interface with streaming and citations
 */

export interface Citation {
  /** File path within the repository */
  filepath?: string;
  /** Title of the source (alternative to filepath) */
  title?: string;
  /** URL of the source */
  url?: string;
  /** Line number for precise code references */
  line?: number;
  /** Relevant content snippet */
  content?: string;
  /** Relevance score (0-1) */
  score: number;
  /** Programming language for syntax highlighting */
  language?: string;
  /** Source type: github or web */
  source?: 'github' | 'web';
  /** Source authority level for weighting */
  authority?: 'primary' | 'authoritative' | 'supplementary' | 'community';
  /** Line reference in formatted display (e.g., "L123-L127") */
  lineReference?: string;
  /** Code type classification */
  codeType?: 'function' | 'class' | 'interface' | 'variable' | 'import';
}

export interface ChatMessage {
  /** Unique message identifier */
  id: string;
  /** Message sender role */
  role: 'user' | 'assistant';
  /** Message text content */
  content: string;
  /** Array of source citations */
  sources?: Citation[];
  /** Message timestamp */
  timestamp: Date;
  /** Whether message is currently streaming */
  streaming?: boolean;
  /** Error state for failed messages */
  error?: boolean;
}

export interface ChatInterfaceProps {
  /** Callback for sending new messages */
  onSendMessage: (message: string) => void;
  /** Array of chat messages */
  messages: ChatMessage[];
  /** Loading state indicator */
  isLoading?: boolean;
  /** Error message if any */
  error?: string;
  /** Maximum height constraint */
  maxHeight?: string;
  /** Whether to show timestamps */
  showTimestamps?: boolean;
}

export interface SourceViewerProps {
  /** Array of citations to display */
  citations: Citation[];
  /** Callback when citation is clicked */
  onCitationClick?: (citation: Citation) => void;
  /** Compact display mode */
  compact?: boolean;
}

export interface StreamingTextProps {
  /** Text content to animate */
  text: string;
  /** Whether to show streaming cursor */
  showCursor?: boolean;
  /** Animation speed in milliseconds per character */
  speed?: number;
  /** Callback when streaming completes */
  onComplete?: () => void;
}

export interface CodeBlockProps {
  /** Code content */
  code: string;
  /** Programming language */
  language?: string;
  /** Whether to show copy button */
  showCopy?: boolean;
  /** File name or path */
  filename?: string;
  /** Starting line number */
  startLine?: number;
}

export interface MockChatData {
  /** Sample messages for demo/testing */
  messages: ChatMessage[];
  /** Sample citations */
  citations: Citation[];
}