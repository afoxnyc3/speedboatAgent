import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function DemoPage() {
  const features = [
    {
      title: "Streaming Responses",
      description: "Real-time text streaming with typewriter animation",
      status: "✅ Implemented"
    },
    {
      title: "Source Citations",
      description: "Clickable citations with file references and code snippets",
      status: "✅ Implemented"
    },
    {
      title: "Syntax Highlighting",
      description: "Code blocks with syntax highlighting and copy functionality",
      status: "✅ Implemented"
    },
    {
      title: "Responsive Design",
      description: "Mobile-first design that works on all screen sizes",
      status: "✅ Implemented"
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4">RAG Chat Interface Demo</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Enhanced chat component with streaming responses, source citations,
            and intelligent code understanding for RAG systems.
          </p>
        </div>

        <div className="space-y-8">
          {/* Features Section */}
          <Card>
            <CardHeader>
              <CardTitle>Features Overview</CardTitle>
              <CardDescription>
                Comprehensive chat interface built for RAG applications
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4">
                {features.map((feature, index) => (
                  <div key={index} className="p-4 border rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold">{feature.title}</h3>
                      <Badge variant="secondary" className="text-xs">
                        {feature.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {feature.description}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Usage Section */}
          <Card>
            <CardHeader>
              <CardTitle>Usage Instructions</CardTitle>
              <CardDescription>
                How to integrate and use the chat interface
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Basic Integration</h3>
                <div className="bg-muted p-4 rounded-lg font-mono text-sm">
                  <pre>{`import ChatInterface from "@/components/chat/ChatInterface";

function MyApp() {
  const handleSendMessage = async (message: string) => {
    // Your RAG API integration here
  };

  return (
    <ChatInterface
      onSendMessage={handleSendMessage}
      messages={messages}
      isLoading={isLoading}
    />
  );
}`}</pre>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Component Files</h3>
                <div className="bg-muted p-4 rounded-lg font-mono text-sm">
                  <pre>{`components/chat/
├── ChatInterface.tsx      # Main chat component
├── StreamingText.tsx      # Typewriter animation
├── SourceViewer.tsx       # Citation display
├── CodeBlock.tsx          # Syntax highlighting
├── types.ts               # TypeScript definitions
└── mockData.ts           # Demo/test data`}</pre>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Demo Link */}
          <Card>
            <CardHeader>
              <CardTitle>Live Demo</CardTitle>
              <CardDescription>
                See the chat interface in action on the main page
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Navigate to the{" "}
                <a href="/" className="text-primary underline hover:no-underline">
                  main application
                </a>{" "}
                to interact with the fully functional chat interface with mock RAG responses.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}