import type { MockChatData } from './types';

/**
 * Mock data for RAG Chat Interface
 * Simulates realistic chat interactions with code citations
 */
export const mockChatData: MockChatData = {
  citations: [
    {
      filepath: 'src/components/ui/button.tsx',
      line: 23,
      content: 'export const Button = forwardRef<HTMLButtonElement, ButtonProps>',
      score: 0.92,
      language: 'typescript',
      url: 'https://github.com/company/repo/blob/main/src/components/ui/button.tsx',
      source: 'github'
    },
    {
      filepath: 'docs/components/button.md',
      content: 'The Button component supports multiple variants including primary, secondary, and outline styles.',
      score: 0.87,
      language: 'markdown',
      url: 'https://docs.company.com/components/button',
      source: 'web'
    },
    {
      filepath: 'src/lib/utils.ts',
      line: 8,
      content: 'export function cn(...inputs: ClassValue[]) {\n  return twMerge(clsx(inputs))\n}',
      score: 0.85,
      language: 'typescript',
      source: 'github'
    }
  ],
  messages: [
    {
      id: '1',
      role: 'user',
      content: 'How do I use the Button component with different variants?',
      timestamp: new Date(Date.now() - 300000)
    },
    {
      id: '2',
      role: 'assistant',
      content: 'The Button component supports multiple variants that you can use to create different styles. Here\'s how to use them:\n\n```typescript\nimport { Button } from "@/components/ui/button"\n\n// Primary button (default)\n<Button>Click me</Button>\n\n// Secondary variant\n<Button variant="secondary">Secondary</Button>\n\n// Outline variant\n<Button variant="outline">Outline</Button>\n```\n\nThe Button component is built with forwardRef for proper ref handling and supports all standard button props.',
      sources: [
        {
          filepath: 'src/components/ui/button.tsx',
          line: 23,
          content: 'export const Button = forwardRef<HTMLButtonElement, ButtonProps>',
          score: 0.92,
          language: 'typescript',
          source: 'github'
        },
        {
          filepath: 'docs/components/button.md',
          content: 'The Button component supports multiple variants including primary, secondary, and outline styles.',
          score: 0.87,
          language: 'markdown',
          source: 'web'
        }
      ],
      timestamp: new Date(Date.now() - 280000)
    },
    {
      id: '3',
      role: 'user',
      content: 'What about the cn utility function? How does it work?',
      timestamp: new Date(Date.now() - 120000)
    },
    {
      id: '4',
      role: 'assistant',
      content: 'The `cn` utility function is a powerful helper for combining CSS classes using clsx and tailwind-merge. Here\'s how it works:\n\n```typescript\nexport function cn(...inputs: ClassValue[]) {\n  return twMerge(clsx(inputs))\n}\n```\n\nIt combines two libraries:\n- **clsx**: Handles conditional class names\n- **twMerge**: Merges Tailwind classes intelligently, removing conflicts\n\nExample usage:\n```typescript\ncn("px-4 py-2", isActive && "bg-blue-500", className)\n```\n\nThis ensures that conflicting Tailwind classes are properly merged.',
      sources: [
        {
          filepath: 'src/lib/utils.ts',
          line: 8,
          content: 'export function cn(...inputs: ClassValue[]) {\n  return twMerge(clsx(inputs))\n}',
          score: 0.85,
          language: 'typescript',
          source: 'github'
        }
      ],
      timestamp: new Date(Date.now() - 100000),
      streaming: false
    }
  ]
};

export const mockStreamingMessage = {
  id: '5',
  role: 'assistant' as const,
  content: 'Here\'s a detailed explanation of how the authentication system works in this codebase...',
  streaming: true,
  timestamp: new Date(),
  sources: [
    {
      filepath: 'src/lib/auth.ts',
      line: 15,
      content: 'export async function authenticate(token: string)',
      score: 0.94,
      language: 'typescript',
      source: 'github' as const
    }
  ]
};