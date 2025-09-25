"use client";

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Sources,
  SourcesTrigger,
  SourcesContent,
  Source
} from '@/components/ai-elements/sources';
import {
  FileIcon,
  ExternalLinkIcon,
  CodeIcon,
  FileTextIcon,
  GithubIcon,
  GlobeIcon
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SourceViewerProps, Citation } from './types';

/**
 * SourceViewer - Displays RAG citations with enhanced UI
 * Shows file references, code snippets, and external links
 */
export default function SourceViewer({
  citations,
  onCitationClick,
  compact = false
}: SourceViewerProps) {
  if (!citations || citations.length === 0) {
    return null;
  }

  const getFileIcon = (citation: Citation) => {
    const ext = citation.filepath.split('.').pop()?.toLowerCase();

    switch (ext) {
      case 'ts':
      case 'tsx':
      case 'js':
      case 'jsx':
        return <CodeIcon className="h-4 w-4" />;
      case 'md':
      case 'mdx':
        return <FileTextIcon className="h-4 w-4" />;
      default:
        return <FileIcon className="h-4 w-4" />;
    }
  };

  const getSourceIcon = (citation: Citation) => {
    return citation.source === 'github' ? (
      <GithubIcon className="h-3 w-3" />
    ) : (
      <GlobeIcon className="h-3 w-3" />
    );
  };

  const handleCitationClick = (citation: Citation) => {
    onCitationClick?.(citation);
    if (citation.url) {
      window.open(citation.url, '_blank', 'noopener,noreferrer');
    }
  };

  if (compact) {
    return (
      <div className="flex flex-wrap gap-1 mt-2">
        {citations.map((citation, index) => (
          <Badge
            key={index}
            variant="secondary"
            className="cursor-pointer hover:bg-secondary/80 transition-colors"
            onClick={() => handleCitationClick(citation)}
          >
            {getSourceIcon(citation)}
            <span className="ml-1 text-xs">
              {citation.filepath.split('/').pop()}
            </span>
          </Badge>
        ))}
      </div>
    );
  }

  return (
    <Sources className="mt-4">
      <SourcesTrigger count={citations.length} />
      <SourcesContent>
        <div className="grid gap-3 max-w-2xl">
          {citations.map((citation, index) => (
            <Card
              key={index}
              className={cn(
                "transition-all hover:shadow-md cursor-pointer",
                "border-l-4 border-l-primary/20"
              )}
              onClick={() => handleCitationClick(citation)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    {getFileIcon(citation)}
                    <span className="truncate">{citation.filepath}</span>
                    {citation.line && (
                      <Badge variant="outline" className="text-xs">
                        L{citation.line}
                      </Badge>
                    )}
                  </CardTitle>
                  <div className="flex items-center gap-1">
                    {getSourceIcon(citation)}
                    <Badge
                      variant="secondary"
                      className="text-xs"
                    >
                      {Math.round(citation.score * 100)}%
                    </Badge>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="pt-0">
                {citation.content && (
                  <div className={cn(
                    "bg-muted/30 rounded p-2 text-sm font-mono",
                    "border-l-2 border-l-primary/30"
                  )}>
                    <pre className="whitespace-pre-wrap text-muted-foreground">
                      {citation.content}
                    </pre>
                  </div>
                )}

                {citation.url && (
                  <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                    <ExternalLinkIcon className="h-3 w-3" />
                    <span className="truncate">{citation.url}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </SourcesContent>
    </Sources>
  );
}