"use client";

import { useState } from "react";
import ChatInterface from "./ChatInterface";
import { mockChatData, mockStreamingMessage } from "./mockData";
import type { ChatMessage } from "./types";

export default function ChatAssistant() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>("");

  const handleSendMessage = async (messageText: string) => {
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: messageText,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);
    setError("");

    try {
      // Try the streaming API first with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: messageText }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.response || "I received your message but couldn't generate a proper response.",
        timestamp: new Date(),
        sources: data.sources || [],
      };
      setMessages((prev) => [...prev, assistantMessage]);

    } catch (error) {
      console.error('Chat API error:', error);

      // Provide more specific error messages
      let errorContent = "Sorry, I encountered an error. Please try again.";
      let fallbackResponse = "";

      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          errorContent = "Request timed out. The system might be experiencing high load. Please try again.";
        } else if (error.message.includes('Failed to fetch')) {
          errorContent = "Network error. Please check your connection and try again.";
        } else if (error.message.includes('500')) {
          errorContent = "Server error. The system is temporarily unavailable.";
          // Provide a basic fallback response for common queries
          fallbackResponse = generateFallbackResponse(messageText);
        }
      }

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: fallbackResponse || errorContent,
        timestamp: new Date(),
        error: !fallbackResponse, // Only mark as error if no fallback
      };

      setMessages((prev) => [...prev, assistantMessage]);
      setError(fallbackResponse ? "" : "Failed to get response from the server.");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle completed streaming messages
  const handleMessageComplete = (message: ChatMessage) => {
    setMessages((prev) => [...prev, message]);
    setIsLoading(false);
    setError("");
  };

  // Simple fallback response generator
  const generateFallbackResponse = (query: string): string => {
    const lowerQuery = query.toLowerCase();

    if (lowerQuery.includes('location') || lowerQuery.includes('open')) {
      return "I understand you're asking about locations. While I'm experiencing some technical difficulties connecting to the full knowledge base, I can tell you that this RAG system is designed to help with questions about code, documentation, and system architecture. Please try your question again in a few moments.";
    }

    if (lowerQuery.includes('button') || lowerQuery.includes('component')) {
      return "I see you're asking about UI components. While the system is experiencing some connectivity issues, I can mention that this application uses modern React components with TypeScript. Please try your question again in a few moments when the system is fully operational.";
    }

    if (lowerQuery.includes('help') || lowerQuery.includes('what') || lowerQuery.includes('how')) {
      return "I'm a RAG (Retrieval-Augmented Generation) assistant designed to help with questions about this codebase and documentation. While I'm experiencing some technical difficulties right now, I'll be able to provide detailed answers with source citations once the system is fully operational. Please try again in a few moments.";
    }

    return "I'm experiencing some technical difficulties connecting to the knowledge base right now. Please try your question again in a few moments. I'm designed to help with questions about code, documentation, and system architecture.";
  };

  return (
    <ChatInterface
      onSendMessage={handleSendMessage}
      onMessageComplete={handleMessageComplete}
      messages={messages}
      isLoading={isLoading}
      error={error}
      showTimestamps={true}
    />
  );
}
