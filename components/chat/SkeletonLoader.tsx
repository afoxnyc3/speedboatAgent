"use client";

import { cn } from '@/lib/utils';

interface SkeletonLoaderProps {
  /** Type of skeleton to show */
  variant?: 'message' | 'search' | 'citation' | 'typing';
  /** Number of lines for message skeleton */
  lines?: number;
  /** Show avatar placeholder */
  showAvatar?: boolean;
  /** Animation delay for staggered effect */
  delay?: number;
  className?: string;
}

/**
 * SkeletonLoader - Provides visual feedback during loading states
 * Reduces perceived wait time with progressive loading animations
 */
export default function SkeletonLoader({
  variant = 'message',
  lines = 3,
  showAvatar = true,
  delay = 0,
  className
}: SkeletonLoaderProps) {
  const baseClasses = "animate-pulse bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 bg-[length:200%_100%] animate-[shimmer_1.5s_ease-in-out_infinite]";

  if (variant === 'typing') {
    return (
      <div className={cn("flex items-center gap-3 p-4", className)} style={{ animationDelay: `${delay}ms` }}>
        {showAvatar && (
          <div className={cn(baseClasses, "w-8 h-8 rounded-full flex-shrink-0")} />
        )}
        <div className="flex items-center gap-1">
          <div className="flex space-x-1">
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0.1s]" />
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0.2s]" />
          </div>
          <span className="text-sm text-gray-500 ml-2">AI is thinking...</span>
        </div>
      </div>
    );
  }

  if (variant === 'search') {
    return (
      <div className={cn("space-y-3 p-4", className)} style={{ animationDelay: `${delay}ms` }}>
        <div className="flex items-center gap-2">
          <div className={cn(baseClasses, "w-4 h-4 rounded")} />
          <div className={cn(baseClasses, "h-3 w-32 rounded")} />
        </div>
        <div className="space-y-2 pl-6">
          <div className={cn(baseClasses, "h-2 w-full rounded")} />
          <div className={cn(baseClasses, "h-2 w-3/4 rounded")} />
          <div className={cn(baseClasses, "h-2 w-1/2 rounded")} />
        </div>
      </div>
    );
  }

  if (variant === 'citation') {
    return (
      <div className={cn("space-y-2 p-3 bg-gray-50 rounded-lg", className)} style={{ animationDelay: `${delay}ms` }}>
        <div className="flex items-center gap-2">
          <div className={cn(baseClasses, "w-4 h-4 rounded")} />
          <div className={cn(baseClasses, "h-3 w-24 rounded")} />
        </div>
        <div className={cn(baseClasses, "h-2 w-full rounded")} />
        <div className={cn(baseClasses, "h-2 w-2/3 rounded")} />
      </div>
    );
  }

  // Default message skeleton
  return (
    <div className={cn("flex gap-3 p-4", className)} style={{ animationDelay: `${delay}ms` }}>
      {showAvatar && (
        <div className={cn(baseClasses, "w-8 h-8 rounded-full flex-shrink-0")} />
      )}
      <div className="flex-1 space-y-2">
        {Array.from({ length: lines }).map((_, index) => (
          <div
            key={index}
            className={cn(
              baseClasses,
              "h-4 rounded",
              index === lines - 1 ? "w-2/3" : "w-full"
            )}
            style={{ animationDelay: `${delay + index * 100}ms` }}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * Progressive loading skeleton that shows different stages
 */
export function ProgressiveSkeletonLoader({ stage }: { stage: 'searching' | 'analyzing' | 'generating' | 'formatting' }) {
  const stages = [
    { key: 'searching', label: 'Searching knowledge base...', icon: '🔍' },
    { key: 'analyzing', label: 'Analyzing sources...', icon: '🧠' },
    { key: 'generating', label: 'Generating response...', icon: '✨' },
    { key: 'formatting', label: 'Formatting output...', icon: '📝' }
  ];

  const currentStageIndex = stages.findIndex(s => s.key === stage);

  return (
    <div className="space-y-4 p-4">
      {stages.map((stageItem, index) => {
        const isActive = index === currentStageIndex;
        const isCompleted = index < currentStageIndex;
        const isPending = index > currentStageIndex;

        return (
          <div key={stageItem.key} className="flex items-center gap-3">
            <div className={cn(
              "w-6 h-6 rounded-full flex items-center justify-center text-xs",
              isActive && "bg-blue-500 text-white animate-pulse",
              isCompleted && "bg-green-500 text-white",
              isPending && "bg-gray-200 text-gray-400"
            )}>
              {isCompleted ? '✓' : stageItem.icon}
            </div>
            <span className={cn(
              "text-sm transition-colors duration-300",
              isActive && "text-blue-600 font-medium",
              isCompleted && "text-green-600",
              isPending && "text-gray-400"
            )}>
              {stageItem.label}
            </span>
            {isActive && (
              <div className="flex space-x-1 ml-2">
                <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce" />
                <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce [animation-delay:0.1s]" />
                <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce [animation-delay:0.2s]" />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}