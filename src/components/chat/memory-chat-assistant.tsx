/**
 * Memory-Enhanced Chat Assistant
 * Integrates conversation memory with existing chat interface
 */

"use client";

import { useState, useEffect } from "react";
import ChatInterface from "./ChatInterface";
import type { ChatMessage } from "./types";
import type { ConversationId, SessionId } from "../../types/memory";

interface MemoryEnhancedChatProps {
  userId?: string;
  conversationId?: string;
  enableMemory?: boolean;
  onMemoryUpdate?: (context: any) => void;
}

interface ChatResponse {
  success: boolean;
  message: ChatMessage;
  conversationId: string;
  suggestions?: string[];
  relatedTopics?: string[];
  error?: any;
}

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
  const [memoryContext, setMemoryContext] = useState<any>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  // Initialize conversation context on mount
  useEffect(() => {
    if (enableMemory) {
      initializeMemoryContext();
    }
  }, [conversationId, enableMemory]);

  const initializeMemoryContext = async () => {
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
    } catch (error) {
      console.warn('Failed to initialize memory context:', error);
    }
  };

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
      const requestPayload = {
        message: messageText,
        conversationId,
        sessionId: enableMemory ? sessionId : undefined,
        userId: enableMemory ? userId : undefined,
        streaming: true, // Enable streaming for better perceived performance
        maxSources: 5,
      };

      // Use streaming endpoint for better perceived performance
      const response = await fetch("/api/chat/stream", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Session-Id": sessionId,
        },
        body: JSON.stringify(requestPayload),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Handle streaming response
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
                case 'token':
                  if (!streamingMessage) {
                    streamingMessage = {
                      id: generateMessageId(),
                      role: 'assistant',
                      content: '',
                      timestamp: new Date(),
                      streaming: true,
                    };
                  }
                  streamingMessage.content = event.data.token;
                  setMessages((prev) => {
                    const filtered = prev.filter(m => m.id !== streamingMessage?.id);
                    return [...filtered, streamingMessage!];
                  });
                  break;

                case 'complete':
                  if (streamingMessage) {
                    // Finalize the streaming message
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

                  // Update conversation ID if it changed
                  if (event.data.message.conversationId !== conversationId) {
                    setConversationId(event.data.message.conversationId as ConversationId);
                  }

                  // Update memory context if available
                  if (enableMemory) {
                    await refreshMemoryContext();
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
      const errorMessage: ChatMessage = {
        id: generateMessageId(),
        role: "assistant",
        content: "I apologize, but I encountered an error processing your request. Please try again.",
        timestamp: new Date(),
        error: true,
      };

      setMessages((prev) => [...prev, errorMessage]);
      setError(error instanceof Error ? error.message : "Unknown error occurred");
      console.error("Chat error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshMemoryContext = async () => {
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
    } catch (error) {
      console.warn('Failed to refresh memory context:', error);
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

function getSmartPlaceholder(memoryContext: any): string {
  if (!memoryContext) {
    return "Ask me anything about your codebase...";
  }

  const entities = memoryContext.entityMentions;
  const topics = memoryContext.topicContinuity;

  if (entities?.length > 0) {
    return `Continue our discussion about ${entities[0]}...`;
  }

  if (topics?.length > 0) {
    return `Ask more about ${topics[0]}...`;
  }

  return "What would you like to know?";
}