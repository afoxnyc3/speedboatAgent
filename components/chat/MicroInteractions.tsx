"use client";

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Search, Brain, Sparkles, FileText, CheckCircle, Clock, Zap } from 'lucide-react';

interface LoadingStageProps {
  stage: 'searching' | 'analyzing' | 'generating' | 'formatting';
  progress?: number;
  duration?: number;
}

/**
 * Animated loading stages with progress indication
 */
export function AnimatedLoadingStages({ stage, progress = 0, duration = 2000 }: LoadingStageProps) {
  const [currentStage, setCurrentStage] = useState(0);
  const [animatedProgress, setAnimatedProgress] = useState(0);

  const stages = [
    { key: 'searching', label: 'Searching knowledge base', icon: Search, color: 'text-blue-500', bgColor: 'bg-blue-100' },
    { key: 'analyzing', label: 'Analyzing sources', icon: Brain, color: 'text-purple-500', bgColor: 'bg-purple-100' },
    { key: 'generating', label: 'Generating response', icon: Sparkles, color: 'text-green-500', bgColor: 'bg-green-100' },
    { key: 'formatting', label: 'Formatting output', icon: FileText, color: 'text-orange-500', bgColor: 'bg-orange-100' }
  ];

  const activeStageIndex = stages.findIndex(s => s.key === stage);

  useEffect(() => {
    setCurrentStage(activeStageIndex);
  }, [activeStageIndex]);

  useEffect(() => {
    if (progress > 0) {
      const timer = setTimeout(() => {
        setAnimatedProgress(progress);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [progress]);

  return (
    <div className="space-y-4 p-4">
      {/* Progress bar */}
      <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-blue-500 to-green-500 rounded-full transition-all duration-700 ease-out"
          style={{ width: `${animatedProgress}%` }}
        />
      </div>

      {/* Stage indicators */}
      <div className="space-y-3">
        {stages.map((stageItem, index) => {
          const isActive = index === currentStage;
          const isCompleted = index < currentStage;
          const isPending = index > currentStage;
          const Icon = stageItem.icon;

          return (
            <div
              key={stageItem.key}
              className={cn(
                "flex items-center gap-3 p-3 rounded-lg transition-all duration-500 transform",
                isActive && `${stageItem.bgColor} scale-105 shadow-md`,
                isCompleted && "bg-green-50",
                isPending && "opacity-50"
              )}
            >
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300",
                isActive && `${stageItem.bgColor} ${stageItem.color} animate-pulse scale-110`,
                isCompleted && "bg-green-500 text-white",
                isPending && "bg-gray-200 text-gray-400"
              )}>
                {isCompleted ? (
                  <CheckCircle className="w-5 h-5" />
                ) : (
                  <Icon className={cn(
                    "w-5 h-5",
                    isActive && "animate-bounce"
                  )} />
                )}
              </div>

              <div className="flex-1">
                <span className={cn(
                  "text-sm font-medium transition-colors duration-300",
                  isActive && stageItem.color,
                  isCompleted && "text-green-600",
                  isPending && "text-gray-400"
                )}>
                  {stageItem.label}
                </span>

                {isActive && (
                  <div className="flex items-center gap-1 mt-1">
                    <div className="flex space-x-1">
                      {[0, 1, 2].map(i => (
                        <div
                          key={i}
                          className={cn(
                            "w-1 h-1 rounded-full animate-bounce",
                            stageItem.color.replace('text-', 'bg-')
                          )}
                          style={{ animationDelay: `${i * 0.1}s` }}
                        />
                      ))}
                    </div>
                    <span className="text-xs text-gray-500 ml-2">Processing...</span>
                  </div>
                )}
              </div>

              {isActive && (
                <Zap className={cn("w-4 h-4 animate-pulse", stageItem.color)} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Floating pulse indicators for background processing
 */
export function FloatingPulse({
  count = 3,
  color = "bg-blue-500",
  size = "w-2 h-2",
  className
}: {
  count?: number;
  color?: string;
  size?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex space-x-2", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={cn(
            size,
            color,
            "rounded-full animate-pulse opacity-75"
          )}
          style={{
            animationDelay: `${i * 0.2}s`,
            animationDuration: "1.5s"
          }}
        />
      ))}
    </div>
  );
}

/**
 * Breathing card animation for loading states
 */
export function BreathingCard({
  children,
  isActive = true,
  className
}: {
  children: React.ReactNode;
  isActive?: boolean;
  className?: string;
}) {
  return (
    <div className={cn(
      "transition-all duration-1000",
      isActive && "animate-pulse scale-[1.02] shadow-lg",
      className
    )}>
      {children}
    </div>
  );
}

/**
 * Typewriter dots that appear and disappear
 */
export function TypewriterDots({
  isVisible = true,
  variant = "default"
}: {
  isVisible?: boolean;
  variant?: "default" | "fade" | "scale";
}) {
  const [currentDot, setCurrentDot] = useState(0);

  useEffect(() => {
    if (!isVisible) return;

    const interval = setInterval(() => {
      setCurrentDot(prev => (prev + 1) % 4);
    }, 400);

    return () => clearInterval(interval);
  }, [isVisible]);

  if (!isVisible) return null;

  return (
    <span className="inline-flex items-center space-x-1">
      {[0, 1, 2].map(i => (
        <span
          key={i}
          className={cn(
            "w-1 h-1 bg-gray-400 rounded-full transition-all duration-200",
            variant === "fade" && "animate-pulse",
            variant === "scale" && "animate-bounce",
            i <= currentDot ? "opacity-100 scale-100" : "opacity-30 scale-75"
          )}
          style={{
            animationDelay: variant === "scale" ? `${i * 0.1}s` : undefined
          }}
        />
      ))}
    </span>
  );
}

/**
 * Shimmer effect for loading text
 */
export function ShimmerText({
  text,
  isLoading = true,
  className
}: {
  text: string;
  isLoading?: boolean;
  className?: string;
}) {
  if (!isLoading) {
    return <span className={className}>{text}</span>;
  }

  return (
    <span className={cn(
      "inline-block bg-gradient-to-r from-gray-300 via-gray-100 to-gray-300 bg-[length:200%_100%] text-transparent bg-clip-text animate-[shimmer_2s_ease-in-out_infinite]",
      className
    )}>
      {text}
    </span>
  );
}

/**
 * Success/completion animation
 */
export function CompletionAnimation({
  isVisible = false,
  onComplete
}: {
  isVisible?: boolean;
  onComplete?: () => void;
}) {
  useEffect(() => {
    if (isVisible && onComplete) {
      const timer = setTimeout(onComplete, 1500);
      return () => clearTimeout(timer);
    }
  }, [isVisible, onComplete]);

  if (!isVisible) return null;

  return (
    <div className="flex items-center justify-center p-4">
      <div className="relative">
        <CheckCircle className="w-8 h-8 text-green-500 animate-in zoom-in-75 duration-500" />
        <div className="absolute inset-0 rounded-full border-2 border-green-500 animate-ping opacity-75" />
      </div>
    </div>
  );
}

/**
 * Wave animation for processing states
 */
export function ProcessingWave({
  isActive = true,
  color = "bg-blue-500"
}: {
  isActive?: boolean;
  color?: string;
}) {
  if (!isActive) return null;

  return (
    <div className="flex items-end space-x-1 h-6">
      {[0, 1, 2, 3, 4].map(i => (
        <div
          key={i}
          className={cn(
            "w-1 rounded-full animate-pulse",
            color
          )}
          style={{
            height: `${20 + Math.sin(i) * 10}px`,
            animationDelay: `${i * 0.1}s`,
            animationDuration: "1s"
          }}
        />
      ))}
    </div>
  );
}

// Custom CSS for shimmer animation (add to globals.css)
export const shimmerKeyframes = `
@keyframes shimmer {
  0% {
    background-position: -200% 0;
  }
  100% {
    background-position: 200% 0;
  }
}
`;