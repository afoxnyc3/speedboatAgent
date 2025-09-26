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
  GlobeIcon,
  StarIcon,
  ShieldCheckIcon,
  InfoIcon,
  UsersIcon
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
    // Use title or filepath, fallback to empty string
    const path = citation.filepath || citation.title || citation.url || '';
    const ext = path.split('.').pop()?.toLowerCase();

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

  const getAuthorityBadge = (authority?: string) => {
    if (!authority) return null;

    const configs = {
      primary: {
        label: 'Primary',
        color: 'bg-green-100 text-green-800 border-green-200',
        icon: <StarIcon className="h-3 w-3" />
      },
      authoritative: {
        label: 'Authoritative',
        color: 'bg-blue-100 text-blue-800 border-blue-200',
        icon: <ShieldCheckIcon className="h-3 w-3" />
      },
      supplementary: {
        label: 'Supplementary',
        color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
        icon: <InfoIcon className="h-3 w-3" />
      },
      community: {
        label: 'Community',
        color: 'bg-gray-100 text-gray-800 border-gray-200',
        icon: <UsersIcon className="h-3 w-3" />
      }
    };

    const config = configs[authority as keyof typeof configs];
    if (!config) return null;

    return (
      <Badge
        variant="outline"
        className={cn("text-xs flex items-center gap-1", config.color)}
      >
        {config.icon}
        {config.label}
      </Badge>
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
          <div key={index} className="flex items-center gap-1">
            <Badge
              variant="secondary"
              className="cursor-pointer hover:bg-secondary/80 transition-colors"
              onClick={() => handleCitationClick(citation)}
            >
              {getSourceIcon(citation)}
              <span className="ml-1 text-xs">
                {(citation.filepath || citation.title || citation.url || '').split('/').pop()}
              </span>
              {(citation.lineReference || citation.line) && (
                <span className="ml-1 text-xs opacity-75">
                  {citation.lineReference || `L${citation.line}`}
                </span>
              )}
            </Badge>
            {citation.authority && (
              <div className="scale-75">
                {getAuthorityBadge(citation.authority)}
              </div>
            )}
          </div>
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
                    <span className="truncate">{citation.filepath || citation.title || citation.url || ''}</span>
                    {(citation.lineReference || citation.line) && (
                      <Badge variant="outline" className="text-xs">
                        {citation.lineReference || `L${citation.line}`}
                      </Badge>
                    )}
                    {citation.codeType && (
                      <Badge variant="secondary" className="text-xs">
                        {citation.codeType}
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
                    {getAuthorityBadge(citation.authority)}
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