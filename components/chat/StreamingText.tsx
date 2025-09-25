"use client";

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import type { StreamingTextProps } from './types';

/**
 * StreamingText - Animates text with typewriter effect
 * Provides smooth streaming animation for RAG responses
 */
export default function StreamingText({
  text,
  showCursor = true,
  speed = 30,
  onComplete
}: StreamingTextProps) {
  const [displayedText, setDisplayedText] = useState('');
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    if (text.length === 0) return;

    let currentIndex = 0;
    setDisplayedText('');
    setIsComplete(false);

    const interval = setInterval(() => {
      if (currentIndex < text.length) {
        setDisplayedText(text.slice(0, currentIndex + 1));
        currentIndex++;
      } else {
        setIsComplete(true);
        clearInterval(interval);
        onComplete?.();
      }
    }, speed);

    return () => clearInterval(interval);
  }, [text, speed, onComplete]);

  return (
    <span className="inline">
      {displayedText}
      {showCursor && !isComplete && (
        <span
          className={cn(
            "inline-block w-0.5 h-4 bg-current ml-0.5",
            "animate-pulse"
          )}
          aria-hidden="true"
        />
      )}
    </span>
  );
}