"use client";

import { useState, useEffect, useRef } from 'react';
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
import { AlertCircle, Bot, User, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import StreamingText from './StreamingText';
import SourceViewer from './SourceViewer';
import CodeBlock from './CodeBlock';
import { FeedbackWidget } from '@/components/chat/FeedbackWidget';
import type { ChatInterfaceProps, ChatMessage } from './types';

/**
 * ChatInterface - Enhanced RAG chat component
 * Supports streaming responses, source citations, and syntax highlighting
 */
export default function ChatInterface({
  onSendMessage,
  messages,
  isLoading = false,
  error,
  maxHeight = '600px',
  showTimestamps = false
}: ChatInterfaceProps) {
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = async (
    message: { text?: string; files?: any[] },
    event: React.FormEvent
  ) => {
    if (!message.text?.trim() || isLoading) return;

    onSendMessage(message.text.trim());
    setInputValue('');
    (event.target as HTMLFormElement).reset();
  };

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
        <ConversationContent
          className={cn(
            "space-y-6 p-4 overflow-y-auto",
            "scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100"
          )}
        >
          {messages.length === 0 ? (
            <ConversationEmptyState
              title="RAG Assistant Ready"
              description="Ask questions about the codebase and I'll provide detailed answers with source citations."
            />
          ) : (
            messages.map((message) => (
              <div key={message.id} className="space-y-2">
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
                          <Badge variant="secondary" className="text-xs">
                            Streaming
                          </Badge>
                        )}
                      </div>
                    )}

                    {/* Message content */}
                    <MessageContent className={cn(message.error && "text-red-600")}>
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
                    {message.role === 'assistant' && !message.streaming && (
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <FeedbackWidget
                          messageId={message.id as any}
                          conversationId={message.id as any}
                          query={messages.find(m => m.role === 'user' && m.id < message.id)?.content}
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
            ))
          )}

          {/* Loading indicator */}
          {isLoading && (
            <Message from="assistant">
              <MessageContent>
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
              </MessageContent>
            </Message>
          )}

          <div ref={messagesEndRef} />
        </ConversationContent>
      </Conversation>

      {/* Input Area */}
      <div className="border-t p-4 bg-background">
        <PromptInput onSubmit={handleSubmit}>
          <PromptInputBody>
            <PromptInputTextarea
              placeholder="Ask about the codebase, architecture, or specific functionality..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              disabled={isLoading}
              className="min-h-[60px] resize-none"
            />
            <PromptInputToolbar>
              <div className="text-xs text-muted-foreground">
                {isLoading ? 'Processing...' : 'Press Enter to send, Shift+Enter for new line'}
              </div>
              <PromptInputSubmit
                status={isLoading ? 'submitted' : undefined}
                disabled={!inputValue.trim() || isLoading}
              />
            </PromptInputToolbar>
          </PromptInputBody>
        </PromptInput>
      </div>
    </div>
  );
}