"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
} from '@/components/ai-elements/conversation';
import { Message, MessageContent } from '@/components/ai-elements/message';
import {
  PromptInput,
  PromptInputBody,
  PromptInputTextarea,
  PromptInputToolbar,
  PromptInputSubmit,
} from '@/components/ai-elements/prompt-input';
// Alert component not available - using inline div instead
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Bot, User, Clock, Search, Brain, Sparkles, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import StreamingText from './StreamingText';
import SourceViewer from './SourceViewer';
import CodeBlock from './CodeBlock';
import { FeedbackWidget } from './FeedbackWidget';
import SkeletonLoader, { ProgressiveSkeletonLoader } from './SkeletonLoader';
import type { ChatInterfaceProps, ChatMessage } from './types';

// Streaming state types
type StreamingStage = 'searching' | 'analyzing' | 'generating' | 'formatting';
type StreamingState = {
  isStreaming: boolean;
  stage?: StreamingStage;
  statusMessage?: string;
  partialContent?: string;
  sources?: any[];
};

/**
 * ChatInterface - Enhanced RAG chat component
 * Supports streaming responses, optimistic UI, and perceived performance improvements
 */
export default function ChatInterface({
  onSendMessage,
  onMessageComplete,
  messages,
  isLoading = false,
  error,
  maxHeight = '600px',
  showTimestamps = false,
  enableStreaming = true
}: ChatInterfaceProps & { enableStreaming?: boolean }) {
  const [inputValue, setInputValue] = useState('');
  const [streamingState, setStreamingState] = useState<StreamingState>({ isStreaming: false });
  const [optimisticMessages, setOptimisticMessages] = useState<ChatMessage[]>([]);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const scrollThrottleRef = useRef<NodeJS.Timeout | null>(null);
  const isUserScrollingRef = useRef(false);

  // Check if user is near bottom of scroll container
  const isUserAtBottom = useCallback(() => {
    if (!scrollContainerRef.current) return true;
    const container = scrollContainerRef.current;
    const threshold = 100; // pixels from bottom
    const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
    return distanceFromBottom < threshold;
  }, []);

  // Smooth scroll to bottom with throttling
  const scrollToBottom = useCallback((force = false) => {
    if (!scrollContainerRef.current) return;

    // Don't auto-scroll if user has manually scrolled up (unless forced)
    if (!force && !isUserAtBottom() && isUserScrollingRef.current) return;

    const container = scrollContainerRef.current;

    // Use instant scroll during streaming to prevent stuttering
    // Use smooth scroll when not streaming for better UX
    const behavior = streamingState.isStreaming ? 'auto' : 'smooth';

    container.scrollTo({
      top: container.scrollHeight,
      behavior: behavior as ScrollBehavior
    });
  }, [streamingState.isStreaming, isUserAtBottom]);

  // Throttled scroll to bottom for streaming updates
  const throttledScrollToBottom = useCallback(() => {
    // Clear existing throttle
    if (scrollThrottleRef.current) {
      clearTimeout(scrollThrottleRef.current);
    }

    // During streaming, throttle scroll updates to every 150ms
    if (streamingState.isStreaming) {
      scrollThrottleRef.current = setTimeout(() => {
        requestAnimationFrame(() => {
          scrollToBottom();
        });
      }, 150);
    } else {
      // When not streaming, scroll immediately
      requestAnimationFrame(() => {
        scrollToBottom();
      });
    }
  }, [streamingState.isStreaming, scrollToBottom]);

  // Detect user scrolling
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    let scrollTimeout: NodeJS.Timeout;

    const handleScroll = () => {
      // Mark that user is actively scrolling
      isUserScrollingRef.current = true;

      // Clear the timeout if user continues scrolling
      clearTimeout(scrollTimeout);

      // After 1 second of no scrolling, check if at bottom
      scrollTimeout = setTimeout(() => {
        if (isUserAtBottom()) {
          isUserScrollingRef.current = false;
        }
      }, 1000);
    };

    container.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      container.removeEventListener('scroll', handleScroll);
      clearTimeout(scrollTimeout);
    };
  }, [isUserAtBottom]);

  // Auto-scroll on new content
  useEffect(() => {
    // Trigger scroll when messages change or streaming content updates
    throttledScrollToBottom();
  }, [
    messages.length,
    optimisticMessages.length,
    streamingState.partialContent,
    throttledScrollToBottom
  ]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (scrollThrottleRef.current) {
        clearTimeout(scrollThrottleRef.current);
      }
    };
  }, []);

  const handleSubmit = async (
    message: { text?: string; files?: any[] },
    event: React.FormEvent
  ) => {
    if (!message.text?.trim() || isLoading || streamingState.isStreaming) return;

    const messageText = message.text.trim();
    setInputValue('');
    (event.target as HTMLFormElement).reset();

    // Add optimistic user message immediately
    const optimisticUserMessage: ChatMessage = {
      id: `opt_user_${Date.now()}`,
      role: 'user',
      content: messageText,
      timestamp: new Date(),
    };
    setOptimisticMessages(prev => [...prev, optimisticUserMessage]);

    if (enableStreaming) {
      await handleStreamingMessage(messageText);
    } else {
      onSendMessage(messageText);
      setOptimisticMessages([]);
    }
  };

  const handleStreamingMessage = useCallback(async (messageText: string) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setStreamingState({ isStreaming: true, stage: 'searching', statusMessage: 'Initializing...' });

    try {
      const response = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: messageText,
          maxSources: 5,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response stream');

      const decoder = new TextDecoder();
      let buffer = '';
      let streamingMessage: ChatMessage | null = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const event = JSON.parse(line.slice(6));

              switch (event.type) {
                case 'status':
                  setStreamingState(prev => ({
                    ...prev,
                    stage: event.data.stage,
                    statusMessage: event.data.message
                  }));
                  break;

                case 'sources':
                  setStreamingState(prev => ({
                    ...prev,
                    sources: event.data.sources
                  }));
                  break;

                case 'token':
                  if (!streamingMessage) {
                    streamingMessage = {
                      id: `stream_${Date.now()}`,
                      role: 'assistant',
                      content: '',
                      timestamp: new Date(),
                      streaming: true,
                    };
                  }
                  streamingMessage.content = event.data.token;
                  setOptimisticMessages(prev => {
                    const filtered = prev.filter(m => m.id !== streamingMessage?.id);
                    return [...filtered, streamingMessage!];
                  });
                  break;

                case 'complete':
                  // Clear optimistic messages and notify parent with the completed message
                  setOptimisticMessages([]);
                  setStreamingState({ isStreaming: false });

                  // Pass the completed message to the parent component
                  if (event.data.message) {
                    // Create a ChatMessage from the streaming response data
                    const completedMessage: ChatMessage = {
                      id: event.data.message.id,
                      role: 'assistant',
                      content: event.data.message.content,
                      timestamp: new Date(event.data.message.timestamp),
                      sources: event.data.sources,
                      suggestions: event.data.suggestions,
                    } as any;

                    // Notify parent component with the completed message
                    // This ensures the message persists in the conversation
                    onMessageComplete?.(completedMessage);
                  }
                  break;

                case 'error':
                  throw new Error(event.data.error);
              }
            } catch (parseError) {
              console.warn('Failed to parse SSE event:', parseError);
            }
          }
        }
      }
    } catch (error) {
      console.error('Streaming error:', error);
      setStreamingState({ isStreaming: false });
      setOptimisticMessages([]);
      // Fallback to non-streaming - but don't retrigger, let parent handle
      console.warn('Streaming failed, parent component should handle with non-streaming API');
    }
  }, [onSendMessage, onMessageComplete, enableStreaming]);

  const formatTimestamp = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }).format(date);
  };

  const renderMessageContent = (message: ChatMessage) => {
    // Handle code blocks in message content
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match;

    while ((match = codeBlockRegex.exec(message.content)) !== null) {
      // Add text before code block
      if (match.index > lastIndex) {
        const textContent = message.content.slice(lastIndex, match.index);
        parts.push(
          <span key={`text-${lastIndex}`}>
            {message.streaming ? (
              <StreamingText text={textContent} showCursor={false} />
            ) : (
              textContent
            )}
          </span>
        );
      }

      // Add code block
      const language = match[1] || 'text';
      const code = match[2].trim();
      parts.push(
        <div key={`code-${match.index}`} className="my-4">
          <CodeBlock code={code} language={language} />
        </div>
      );

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < message.content.length) {
      const remainingText = message.content.slice(lastIndex);
      parts.push(
        <span key={`text-${lastIndex}`}>
          {message.streaming ? (
            <StreamingText text={remainingText} />
          ) : (
            remainingText
          )}
        </span>
      );
    }

    // If no code blocks found, render as streaming or normal text
    if (parts.length === 0) {
      return message.streaming ? (
        <StreamingText text={message.content} />
      ) : (
        <div className="whitespace-pre-wrap">{message.content}</div>
      );
    }

    return <div className="space-y-2">{parts}</div>;
  };

  // Combine real messages with optimistic messages
  const allMessages = [...messages, ...optimisticMessages];

  const getStageIcon = (stage: StreamingStage) => {
    switch (stage) {
      case 'searching': return <Search className="w-4 h-4" />;
      case 'analyzing': return <Brain className="w-4 h-4" />;
      case 'generating': return <Sparkles className="w-4 h-4" />;
      case 'formatting': return <FileText className="w-4 h-4" />;
      default: return <Bot className="w-4 h-4" />;
    }
  };

  return (
    <div
      className="flex flex-col h-full"
      style={{ maxHeight }}
    >
      {/* Error Alert */}
      {error && (
        <div className="m-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          <span>{error}</span>
        </div>
      )}

      {/* Messages Container */}
      <Conversation className="flex-1 overflow-hidden">
        <div ref={scrollContainerRef} className="h-full overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
          <ConversationContent className="space-y-6 p-4">
          {allMessages.length === 0 && !streamingState.isStreaming ? (
            <ConversationEmptyState
              title="RAG Assistant Ready"
              description="Ask questions about the codebase and I'll provide detailed answers with source citations."
            />
          ) : (
            <>
              {allMessages.map((message) => (
                <div key={message.id} className={cn(
                  "space-y-2 transition-all duration-300",
                  message.id.startsWith('opt_') && "opacity-90 transform translate-y-1"
                )}>
                  <Message from={message.role}>
                    <div className="space-y-2">
                      {/* Message header with timestamp */}
                      {showTimestamps && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          {message.role === 'user' ? (
                            <User className="h-3 w-3" />
                          ) : (
                            <Bot className="h-3 w-3" />
                          )}
                          <Clock className="h-3 w-3" />
                          <span>{formatTimestamp(message.timestamp)}</span>
                          {message.streaming && (
                            <Badge variant="secondary" className="text-xs animate-pulse">
                              <div className="flex items-center gap-1">
                                <div className="w-1 h-1 bg-current rounded-full animate-bounce" />
                                Streaming
                              </div>
                            </Badge>
                          )}
                          {message.id.startsWith('opt_') && (
                            <Badge variant="outline" className="text-xs">
                              Sending...
                            </Badge>
                          )}
                        </div>
                      )}

                      {/* Message content */}
                      <MessageContent className={cn(
                        message.error && "text-red-600",
                        message.id.startsWith('opt_') && "opacity-75"
                      )}>
                        {renderMessageContent(message)}
                      </MessageContent>

                      {/* Source citations */}
                      {message.sources && message.sources.length > 0 && (
                        <div className="mt-4">
                          <SourceViewer
                            citations={message.sources}
                            onCitationClick={(citation) => {
                              console.log('Citation clicked:', citation);
                            }}
                          />
                        </div>
                      )}

                      {/* Feedback widget for assistant messages */}
                      {message.role === 'assistant' && !message.streaming && !message.id.startsWith('opt_') && (
                        <div className="mt-3 pt-3 border-t border-gray-100">
                          <FeedbackWidget
                            messageId={message.id as any}
                            conversationId={message.id as any}
                            query={allMessages.find(m => m.role === 'user' && m.id < message.id)?.content}
                            response={message.content}
                            sources={message.sources?.map(s => String(s.source)).filter(s => s !== 'undefined')}
                            onFeedbackSubmit={(feedback) => {
                              console.log('Feedback submitted:', feedback);
                            }}
                          />
                        </div>
                      )}
                    </div>
                  </Message>
                </div>
              ))}
            </>
          )}

          {/* Enhanced loading indicators */}
          {(isLoading || streamingState.isStreaming) && (
            <Message from="assistant">
              <MessageContent>
                {streamingState.isStreaming && streamingState.stage ? (
                  <div className="space-y-4">
                    {/* Progressive loading stages */}
                    <ProgressiveSkeletonLoader stage={streamingState.stage} />

                    {/* Sources preview */}
                    {streamingState.sources && streamingState.sources.length > 0 && (
                      <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="flex items-center gap-2 text-sm text-blue-800 mb-2">
                          <FileText className="w-4 h-4" />
                          <span>Found {streamingState.sources.length} relevant sources</span>
                        </div>
                        <div className="space-y-1">
                          {streamingState.sources.slice(0, 2).map((source: any, index: number) => (
                            <div key={index} className="text-xs text-blue-600 truncate">
                              {source.metadata?.filepath || source.metadata?.url || 'Source'}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-current rounded-full animate-bounce" />
                      <div className="w-2 h-2 bg-current rounded-full animate-bounce [animation-delay:0.1s]" />
                      <div className="w-2 h-2 bg-current rounded-full animate-bounce [animation-delay:0.2s]" />
                    </div>
                    <span className="text-muted-foreground">
                      Searching knowledge base...
                    </span>
                  </div>
                )}
              </MessageContent>
            </Message>
          )}

          <div ref={messagesEndRef} />
          </ConversationContent>
        </div>
      </Conversation>

      {/* Input Area */}
      <div className={cn(
        "border-t p-4 bg-background transition-all duration-200",
        isInputFocused && "bg-blue-50/50 border-blue-200",
        (isLoading || streamingState.isStreaming) && "opacity-75"
      )}>
        <PromptInput onSubmit={handleSubmit}>
          <PromptInputBody>
            <PromptInputTextarea
              placeholder={getSmartPlaceholder()}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onFocus={() => setIsInputFocused(true)}
              onBlur={() => setIsInputFocused(false)}
              disabled={isLoading || streamingState.isStreaming}
              className={cn(
                "min-h-[60px] resize-none transition-all duration-200",
                isInputFocused && "ring-2 ring-blue-200"
              )}
            />
            <PromptInputToolbar>
              <div className="text-xs text-muted-foreground">
                {streamingState.isStreaming ? (
                  <div className="flex items-center gap-2">
                    {getStageIcon(streamingState.stage!)}
                    <span>{streamingState.statusMessage}</span>
                  </div>
                ) : isLoading ? (
                  'Processing...'
                ) : (
                  'Press Enter to send, Shift+Enter for new line'
                )}
              </div>
              <PromptInputSubmit
                status={(isLoading || streamingState.isStreaming) ? 'submitted' : undefined}
                disabled={!inputValue.trim() || isLoading || streamingState.isStreaming}
              />
            </PromptInputToolbar>
          </PromptInputBody>
        </PromptInput>
      </div>
    </div>
  );

  function getSmartPlaceholder(): string {
    if (streamingState.isStreaming) {
      return "Processing your request...";
    }
    if (allMessages.length === 0) {
      return "Ask about the codebase, architecture, or specific functionality...";
    }
    return "Continue the conversation...";
  }
}