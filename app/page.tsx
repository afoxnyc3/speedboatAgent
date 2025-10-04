"use client";

import { useState } from "react";
import ChatAssistant from "@/components/chat/chat-assistant";
import { SentryTestComponent } from "@/src/components/monitoring/SentryTestComponent";
import ErrorBoundary from "@/components/ErrorBoundary";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";

export default function Home() {
  const [key, setKey] = useState(0);

  const handleNewConversation = () => {
    // Force remount of ChatAssistant by changing key
    setKey(prev => prev + 1);
  };

  return (
    <ErrorBoundary>
      <div className="h-screen bg-background flex flex-col max-w-4xl mx-auto">
        {/* Header with toolbar */}
        <div className="border-b p-4 flex items-center justify-between">
          <h1 className="text-xl font-semibold">AI Chat Assistant</h1>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleNewConversation}
              className="flex items-center gap-2 min-h-[44px] min-w-[44px]"
            >
              <PlusCircle className="h-4 w-4" />
              New Conversation
            </Button>
          </div>
        </div>

        {/* Sentry Testing Panel - Remove in production */}
        {process.env.NEXT_PUBLIC_APP_ENV === 'development' && (
          <div className="p-4 border-b bg-gray-50">
            <SentryTestComponent />
          </div>
        )}

        <div className="flex-1">
          <ChatAssistant key={key} />
        </div>
      </div>
    </ErrorBoundary>
  );
}
