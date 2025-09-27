"use client";

import { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import type { StreamingTextProps } from './types';

/**
 * StreamingText - Enhanced typewriter effect with realistic timing
 * Provides smooth streaming animation for RAG responses with variable speed
 */
export default function StreamingText({
  text,
  showCursor = true,
  speed = 30,
  onComplete
}: StreamingTextProps) {
  const [displayedText, setDisplayedText] = useState('');
  const [isComplete, setIsComplete] = useState(false);
  const [currentWordIndex, setCurrentWordIndex] = useState(0);

  // Calculate variable typing speed based on character type
  const getTypingDelay = useCallback((char: string, position: number) => {
    // Faster for spaces and common characters
    if (char === ' ') return speed * 0.3;
    if (/[.,!?;:]/.test(char)) return speed * 2; // Pause at punctuation
    if (/[A-Z]/.test(char)) return speed * 1.2; // Slightly slower for capitals
    if (/\d/.test(char)) return speed * 0.8; // Faster for numbers

    // Add some randomness for natural feel
    const randomFactor = 0.8 + Math.random() * 0.4;
    return speed * randomFactor;
  }, [speed]);

  useEffect(() => {
    if (text.length === 0) return;

    let currentIndex = 0;
    let timeoutId: NodeJS.Timeout;
    setDisplayedText('');
    setIsComplete(false);
    setCurrentWordIndex(0);

    const typeNextCharacter = () => {
      if (currentIndex < text.length) {
        const char = text[currentIndex];
        setDisplayedText(text.slice(0, currentIndex + 1));

        // Update word index for highlighting effect
        if (char === ' ') {
          setCurrentWordIndex(prev => prev + 1);
        }

        currentIndex++;
        const delay = getTypingDelay(char, currentIndex);
        timeoutId = setTimeout(typeNextCharacter, delay);
      } else {
        setIsComplete(true);
        onComplete?.();
      }
    };

    // Small initial delay for natural feel
    timeoutId = setTimeout(typeNextCharacter, Math.random() * 100 + 50);

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [text, getTypingDelay, onComplete]);

  return (
    <span className="inline relative">
      <span className="animate-in slide-in-from-left-1 duration-100">
        {displayedText}
      </span>
      {showCursor && !isComplete && (
        <span
          className={cn(
            "inline-block w-0.5 h-4 bg-blue-500 ml-0.5",
            "animate-pulse transition-all duration-75",
            "shadow-sm"
          )}
          aria-hidden="true"
        />
      )}
      {/* Subtle glow effect while typing */}
      {!isComplete && (
        <span
          className="absolute inset-0 bg-gradient-to-r from-transparent via-blue-50 to-transparent opacity-20 animate-pulse pointer-events-none"
          aria-hidden="true"
        />
      )}
    </span>
  );
}

/**
 * WordByWordStreaming - Alternative streaming effect that reveals words
 */
export function WordByWordStreaming({
  text,
  wordDelay = 150,
  onComplete
}: {
  text: string;
  wordDelay?: number;
  onComplete?: () => void;
}) {
  const [visibleWords, setVisibleWords] = useState(0);
  const words = text.split(' ');

  useEffect(() => {
    if (words.length === 0) return;

    let currentWord = 0;
    const interval = setInterval(() => {
      if (currentWord < words.length) {
        setVisibleWords(currentWord + 1);
        currentWord++;
      } else {
        clearInterval(interval);
        onComplete?.();
      }
    }, wordDelay);

    return () => clearInterval(interval);
  }, [text, wordDelay, onComplete, words.length]);

  return (
    <span>
      {words.slice(0, visibleWords).map((word, index) => (
        <span
          key={index}
          className={cn(
            "inline-block animate-in slide-in-from-bottom-2 duration-200",
            "mr-1 transition-all"
          )}
          style={{ animationDelay: `${index * 50}ms` }}
        >
          {word}
        </span>
      ))}
    </span>
  );
}

/**
 * TypingIndicator - Shows when AI is thinking/typing
 */
export function TypingIndicator({
  message = "AI is thinking...",
  size = "default",
  variant = "dots"
}: {
  message?: string;
  size?: "sm" | "default" | "lg";
  variant?: "dots" | "wave" | "pulse";
}) {
  const sizeClasses = {
    sm: "w-1 h-1",
    default: "w-2 h-2",
    lg: "w-3 h-3"
  };

  if (variant === "wave") {
    return (
      <div className="flex items-center gap-3">
        <div className="flex space-x-1">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={cn(
                sizeClasses[size],
                "bg-blue-500 rounded-full animate-bounce"
              )}
              style={{
                animationDelay: `${i * 0.1}s`,
                animationDuration: "1s"
              }}
            />
          ))}
        </div>
        <span className="text-sm text-gray-600 animate-pulse">{message}</span>
      </div>
    );
  }

  if (variant === "pulse") {
    return (
      <div className="flex items-center gap-3">
        <div className={cn(
          sizeClasses[size === "sm" ? "default" : size],
          "bg-blue-500 rounded-full animate-ping"
        )} />
        <span className="text-sm text-gray-600">{message}</span>
      </div>
    );
  }

  // Default dots variant
  return (
    <div className="flex items-center gap-3">
      <div className="flex space-x-1">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={cn(
              sizeClasses[size],
              "bg-current rounded-full animate-bounce opacity-75"
            )}
            style={{ animationDelay: `${i * 0.1}s` }}
          />
        ))}
      </div>
      <span className="text-sm text-muted-foreground">{message}</span>
    </div>
  );
}