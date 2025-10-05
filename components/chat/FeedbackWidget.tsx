'use client';

import React, { useState, useCallback } from 'react';
import { ThumbsUp, ThumbsDown, X } from 'lucide-react';
import type { FeedbackType, FeedbackCategory } from '../../src/types/feedback';
import type { MessageId, ConversationId } from '../../src/types/chat';

interface FeedbackWidgetProps {
  messageId: MessageId;
  conversationId: ConversationId;
  query?: string;
  response?: string;
  sources?: string[];
  onFeedbackSubmit?: (feedback: FeedbackData) => void;
  className?: string;
}

interface FeedbackData {
  type: FeedbackType;
  messageId: MessageId;
  conversationId: ConversationId;
  category?: FeedbackCategory;
  comment?: string;
  context?: {
    query?: string;
    response?: string;
    sources?: string[];
  };
}

export function FeedbackWidget({
  messageId,
  conversationId,
  query,
  response,
  sources,
  onFeedbackSubmit,
  className = '',
}: FeedbackWidgetProps) {
  const [feedbackGiven, setFeedbackGiven] = useState<FeedbackType | null>(null);
  const [showComment, setShowComment] = useState(false);
  const [comment, setComment] = useState('');
  const [category, setCategory] = useState<FeedbackCategory>('other');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFeedback = useCallback(async (type: FeedbackType) => {
    if (isSubmitting) return;

    if (type === feedbackGiven) {
      // Toggle off if same button clicked
      setFeedbackGiven(null);
      setShowComment(false);
      return;
    }

    setFeedbackGiven(type);

    if (type === 'thumbs_down') {
      setShowComment(true);
    } else {
      // Submit positive feedback immediately
      await submitFeedback(type);
    }
  }, [feedbackGiven, isSubmitting]);

  const submitFeedback = useCallback(async (
    type: FeedbackType,
    includeComment = false
  ) => {
    setIsSubmitting(true);

    const feedbackData: FeedbackData = {
      type,
      messageId,
      conversationId,
      ...(includeComment && comment && { comment }),
      ...(includeComment && { category }),
      context: {
        query,
        response,
        sources,
      },
    };

    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(feedbackData),
      });

      if (res.ok) {
        onFeedbackSubmit?.(feedbackData);
        if (!includeComment) {
          setShowComment(false);
        }
      }
    } catch (error) {
      console.error('Failed to submit feedback:', error);
      setFeedbackGiven(null);
    } finally {
      setIsSubmitting(false);
    }
  }, [messageId, conversationId, query, response, sources, comment, category, onFeedbackSubmit]);

  const handleCommentSubmit = useCallback(async () => {
    if (!feedbackGiven || !comment.trim()) return;
    await submitFeedback(feedbackGiven, true);
    setComment('');
    setShowComment(false);
  }, [feedbackGiven, comment, submitFeedback]);

  return (
    <div className={`feedback-widget ${className}`}>
      <div className="flex items-center gap-2">
        <span className="text-sm text-white/70">Was this helpful?</span>

        <button
          onClick={() => handleFeedback('thumbs_up')}
          disabled={isSubmitting}
          className={`p-1.5 rounded-md transition-all ${
            feedbackGiven === 'thumbs_up'
              ? 'bg-green-400/20 text-green-300'
              : 'hover:bg-white/10 text-white/60 hover:text-white/90'
          } ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
          aria-label="Thumbs up"
        >
          <ThumbsUp className="w-4 h-4" />
        </button>

        <button
          onClick={() => handleFeedback('thumbs_down')}
          disabled={isSubmitting}
          className={`p-1.5 rounded-md transition-all ${
            feedbackGiven === 'thumbs_down'
              ? 'bg-red-400/20 text-red-300'
              : 'hover:bg-white/10 text-white/60 hover:text-white/90'
          } ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
          aria-label="Thumbs down"
        >
          <ThumbsDown className="w-4 h-4" />
        </button>
      </div>

      {showComment && feedbackGiven === 'thumbs_down' && (
        <div className="mt-2 p-3 bg-white/5 rounded-lg border border-white/10">
          <div className="flex justify-between items-start mb-2">
            <span className="text-sm font-medium text-white/90">
              What could be better?
            </span>
            <button
              onClick={() => setShowComment(false)}
              className="text-white/60 hover:text-white/90 transition-colors"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as FeedbackCategory)}
            className="w-full mb-2 px-2 py-1 text-sm border border-white/20 rounded bg-white/5 text-white/90"
          >
            <option value="relevance">Not relevant</option>
            <option value="accuracy">Inaccurate</option>
            <option value="completeness">Incomplete</option>
            <option value="clarity">Unclear</option>
            <option value="sources">Wrong sources</option>
            <option value="other">Other</option>
          </select>

          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Optional: Tell us more..."
            className="w-full px-2 py-1 text-sm border border-white/20 rounded resize-none bg-white/5 text-white/90 placeholder:text-white/40"
            rows={2}
            maxLength={1000}
          />

          <div className="flex justify-between items-center mt-2">
            <span className="text-xs text-white/50">
              {comment.length}/1000
            </span>
            <button
              onClick={handleCommentSubmit}
              disabled={isSubmitting}
              className={`px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors ${
                isSubmitting ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {isSubmitting ? 'Sending...' : 'Send'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}