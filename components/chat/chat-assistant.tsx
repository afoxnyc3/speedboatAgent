"use client";

import { useState } from "react";
import ChatInterface from "./ChatInterface";
import { mockChatData, mockStreamingMessage } from "./mockData";
import type { ChatMessage } from "./types";

export default function ChatAssistant() {
  const [messages, setMessages] = useState<ChatMessage[]>(mockChatData.messages);
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
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: messageText }),
      });

      const data = await response.json();

      if (response.ok) {
        const assistantMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: data.response,
          timestamp: new Date(),
          sources: data.sources || [],
        };
        setMessages((prev) => [...prev, assistantMessage]);
      } else {
        throw new Error(data.error || "Failed to get response");
      }
    } catch (error) {
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "Sorry, I encountered an error. Please try again.",
        timestamp: new Date(),
        error: true,
      };
      setMessages((prev) => [...prev, errorMessage]);
      setError("Failed to get response from the server.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ChatInterface
      onSendMessage={handleSendMessage}
      messages={messages}
      isLoading={isLoading}
      error={error}
      showTimestamps={true}
    />
  );
}
