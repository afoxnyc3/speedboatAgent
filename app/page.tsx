import ChatAssistant from "@/components/chat/chat-assistant";
import { SentryTestComponent } from "@/src/components/monitoring/SentryTestComponent";

export default function Home() {
  return (
    <div className="h-screen bg-background flex flex-col max-w-4xl mx-auto">
      <div className="border-b p-4">
        <h1 className="text-xl font-semibold">AI Chat Assistant</h1>
      </div>

      {/* Sentry Testing Panel - Remove in production */}
      {process.env.NEXT_PUBLIC_APP_ENV === 'development' && (
        <div className="p-4 border-b bg-gray-50">
          <SentryTestComponent />
        </div>
      )}

      <div className="flex-1">
        <ChatAssistant />
      </div>
    </div>
  );
}
