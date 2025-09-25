"use client";

import { useState } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Button } from '@/components/ui/button';
import { CopyIcon, CheckIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CodeBlockProps } from './types';

/**
 * CodeBlock - Syntax highlighted code with copy functionality
 * Supports multiple languages and proper accessibility
 */
export default function CodeBlock({
  code,
  language = 'text',
  showCopy = true,
  filename,
  startLine = 1
}: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy code:', error);
    }
  };

  return (
    <div className="relative rounded-md border bg-muted/20 overflow-hidden">
      {/* Header with filename and copy button */}
      {(filename || showCopy) && (
        <div className="flex items-center justify-between px-4 py-2 bg-muted/40 border-b">
          {filename && (
            <span className="text-sm font-mono text-muted-foreground">
              {filename}
            </span>
          )}
          {showCopy && (
            <Button
              variant="ghost"
              size="sm"
              onClick={copyToClipboard}
              className="h-6 px-2"
              aria-label={copied ? 'Copied' : 'Copy code'}
            >
              {copied ? (
                <CheckIcon className="h-3 w-3" />
              ) : (
                <CopyIcon className="h-3 w-3" />
              )}
            </Button>
          )}
        </div>
      )}

      {/* Code content */}
      <div className="relative overflow-x-auto">
        <SyntaxHighlighter
          language={language}
          style={oneDark}
          customStyle={{
            margin: 0,
            padding: '1rem',
            background: 'transparent',
            fontSize: '0.875rem'
          }}
          showLineNumbers={startLine > 1}
          startingLineNumber={startLine}
          wrapLongLines={false}
        >
          {code}
        </SyntaxHighlighter>

        {/* Copy button overlay for mobile */}
        {showCopy && !filename && (
          <Button
            variant="ghost"
            size="sm"
            onClick={copyToClipboard}
            className={cn(
              "absolute top-2 right-2 h-6 w-6 p-0 opacity-0 transition-opacity",
              "group-hover:opacity-100 focus:opacity-100"
            )}
            aria-label={copied ? 'Copied' : 'Copy code'}
          >
            {copied ? (
              <CheckIcon className="h-3 w-3" />
            ) : (
              <CopyIcon className="h-3 w-3" />
            )}
          </Button>
        )}
      </div>
    </div>
  );
}