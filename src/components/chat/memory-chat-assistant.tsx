/**
 * Memory-Enhanced Chat Assistant
 * Integrates conversation memory with existing chat interface
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import ChatInterface from "./ChatInterface";
import type { ChatMessage } from "./types";
import type { ConversationId, SessionId } from "../../types/memory";

interface MemoryEnhancedChatProps {
  userId?: string;
  conversationId?: string;
  enableMemory?: boolean;
  onMemoryUpdate?: (context: MemoryContext) => void;
}

// ChatResponse interface moved to types file to avoid duplication

export default function MemoryChatAssistant({
  userId,
  conversationId: initialConversationId,
  enableMemory = true,
  onMemoryUpdate,
}: MemoryEnhancedChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [sessionId] = useState<SessionId>(() => generateSessionId());
  const [conversationId, setConversationId] = useState<ConversationId>(
    (initialConversationId as ConversationId) || generateConversationId()
  );
  const [memoryContext, setMemoryContext] = useState<MemoryContext | null>(null);

// Memory context type
type MemoryContext = {
  entityMentions: string[];
  topicContinuity: string[];
  relevantMemories: Array<{ content: string }>;
  conversationStage: string;
};
  const [suggestions, setSuggestions] = useState<string[]>([]);

  // Wrap initializeMemoryContext with useCallback to fix dependency issues
  const initializeMemoryContext = useCallback(async () => {
    if (!enableMemory) return;

    try {
      const response = await fetch('/api/memory/context', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId,
          sessionId,
          userId,
        }),
      });

      if (response.ok) {
        const context = await response.json();
        setMemoryContext(context);
        onMemoryUpdate?.(context);
      }
    } catch {
      // Failed to initialize memory context - continue without it
    }
  }, [conversationId, sessionId, userId, enableMemory, onMemoryUpdate]);

  // Refresh memory context helper
  const refreshMemoryContext = useCallback(async () => {
    if (!enableMemory) return;

    try {
      const response = await fetch('/api/memory/context', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId,
          sessionId,
          userId,
        }),
      });

      if (response.ok) {
        const context = await response.json();
        setMemoryContext(context);
        onMemoryUpdate?.(context);
      }
    } catch {
      // Failed to refresh memory context - continue without it
    }
  }, [conversationId, sessionId, userId, enableMemory, onMemoryUpdate]);

  // Initialize conversation context on mount
  useEffect(() => {
    initializeMemoryContext();
  }, [initializeMemoryContext]);

  // Helper function to process streaming events
  const processStreamEvent = useCallback(async (
    event: { type: string; data: { token?: string; sources?: any[]; suggestions?: string[]; message?: { conversationId: string }; error?: string } },
    streamingMessage: ChatMessage | null,
    setStreamingMessage: (msg: ChatMessage | null) => void
  ) => {
    switch (event.type) {
      case 'token':
        if (!streamingMessage) {
          const newMessage = {
            id: generateMessageId(),
            role: 'assistant' as const,
            content: '',
            timestamp: new Date(),
            streaming: true,
          };
          setStreamingMessage(newMessage);
          streamingMessage = newMessage;
        }
        streamingMessage.content = event.data.token;
        setMessages((prev) => {
          const filtered = prev.filter(m => m.id !== streamingMessage?.id);
          return [...filtered, streamingMessage!];
        });
        break;

      case 'complete':
        if (streamingMessage) {
          const finalMessage = {
            ...streamingMessage,
            streaming: false,
            sources: event.data.sources,
            timestamp: new Date(),
          };
          setMessages((prev) => {
            const filtered = prev.filter(m => m.id !== streamingMessage?.id);
            return [...filtered, finalMessage];
          });
        }
        setSuggestions(event.data.suggestions || []);

        if (event.data.message.conversationId !== conversationId) {
          setConversationId(event.data.message.conversationId as ConversationId);
        }

        if (enableMemory) {
          await refreshMemoryContext();
        }
        break;

      case 'error':
        throw new Error(event.data.error);
    }
  }, [conversationId, enableMemory, refreshMemoryContext]);

  const handleSendMessage = async (messageText: string) => {
    const userMessage: ChatMessage = {
      id: generateMessageId(),
      role: "user",
      content: messageText,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);
    setError("");
    setSuggestions([]);

    try {
      const response = await fetch("/api/chat/stream", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Session-Id": sessionId,
        },
        body: JSON.stringify({
          message: messageText,
          conversationId,
          sessionId: enableMemory ? sessionId : undefined,
          userId: enableMemory ? userId : undefined,
          streaming: true,
          maxSources: 5,
        }),
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
              await processStreamEvent(event, streamingMessage, (msg) => { streamingMessage = msg; });
            } catch {
              // Failed to parse SSE event - continue processing
            }
          }
        }
      }
    } catch (error) {
      const errorMessage: ChatMessage = {
        id: generateMessageId(),
        role: "assistant",
        content: "I apologize, but I encountered an error processing your request. Please try again.",
        timestamp: new Date(),
        error: true,
      };

      setMessages((prev) => [...prev, errorMessage]);
      setError(error instanceof Error ? error.message : "Unknown error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    handleSendMessage(suggestion);
  };

  const clearConversation = async () => {
    setMessages([]);
    setSuggestions([]);
    setError("");
    setConversationId(generateConversationId());

    if (enableMemory) {
      // Optionally clear memory session
      try {
        await fetch('/api/memory/clear', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId,
            userId,
          }),
        });
      } catch (error) {
        console.warn('Failed to clear memory:', error);
      }
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1">
        <ChatInterface
          onSendMessage={handleSendMessage}
          messages={messages}
          isLoading={isLoading}
          error={error}
          showTimestamps={true}
          enableStreaming={true}
        />
      </div>

      {/* Memory Context Display */}
      {enableMemory && memoryContext && (
        <div className="border-t p-3 bg-gray-50 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-gray-600">
              Memory: {memoryContext.relevantMemories?.length || 0} context items
            </span>
            <button
              onClick={clearConversation}
              className="text-gray-500 hover:text-gray-700"
              title="Clear conversation"
            >
              🗑️
            </button>
          </div>
          {memoryContext.entityMentions?.length > 0 && (
            <div className="mt-1 text-gray-500">
              Entities: {memoryContext.entityMentions.slice(0, 3).join(", ")}
            </div>
          )}
        </div>
      )}

      {/* Suggestions */}
      {suggestions.length > 0 && (
        <div className="border-t p-3">
          <div className="text-sm text-gray-600 mb-2">Suggested questions:</div>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((suggestion, index) => (
              <button
                key={index}
                onClick={() => handleSuggestionClick(suggestion)}
                className="px-3 py-1 text-sm bg-blue-100 hover:bg-blue-200 rounded-full transition-colors"
                disabled={isLoading}
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Utility functions
function generateSessionId(): SessionId {
  return `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}` as SessionId;
}

function generateConversationId(): ConversationId {
  return `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}` as ConversationId;
}

function generateMessageId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// getSmartPlaceholder function removed - functionality moved to ChatInterface