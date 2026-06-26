'use client';

import { useRef, useEffect, useState } from 'react';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';
import TypingIndicator from './TypingIndicator';
import SuggestedActions from './SuggestedActions';
import type { ChatMessage as ChatMessageType, TripMemory } from '@/types/chat';

interface ChatWindowProps {
  messages: ChatMessageType[];
  isStreaming: boolean;
  memory: TripMemory;
  error: string | null;
  onSendMessage: (text: string) => void;
  onClearError: () => void;
}

export default function ChatWindow({
  messages,
  isStreaming,
  memory,
  error,
  onSendMessage,
  onClearError,
}: ChatWindowProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [messages, isStreaming]);

  // Track scroll position for "scroll to bottom" button
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
      setShowScrollButton(distanceFromBottom > 100);
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  const isEmpty = messages.length === 0;

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Messages area */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto relative"
      >
        {isEmpty ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center h-full px-6 py-16">
            <div className="w-16 h-16 rounded-2xl bg-primary-container/20 flex items-center justify-center mb-6">
              <span className="material-symbols-outlined text-4xl text-primary">
                travel_explore
              </span>
            </div>
            <h2 className="text-headline-md font-bold text-on-surface mb-2 text-center">
              Plan Your Trip with AI
            </h2>
            <p className="text-body-lg text-secondary text-center max-w-md mb-10 leading-relaxed">
              Tell me where you want to go, your budget, dates, and preferences.
              I&apos;ll help you create the perfect itinerary.
            </p>
            <SuggestedActions
              memory={memory}
              onAction={onSendMessage}
              visible={true}
            />
          </div>
        ) : (
          /* Messages list */
          <div className="max-w-3xl mx-auto py-6 space-y-1 px-4">
            {messages.map((msg, idx) => {
              if (msg.role === 'assistant' && !msg.content) return null;

              return (
                <ChatMessage
                  key={idx}
                  message={msg}
                  isStreaming={
                    isStreaming &&
                    idx === messages.length - 1 &&
                    msg.role === 'assistant'
                  }
                />
              );
            })}

            {/* Typing indicator — shown only when streaming hasn't started text yet */}
            <TypingIndicator
              visible={
                isStreaming &&
                messages[messages.length - 1]?.role === 'assistant' &&
                messages[messages.length - 1]?.content === ''
              }
            />

            <div ref={messagesEndRef} />
          </div>
        )}

        {/* Scroll to bottom button */}
        {showScrollButton && (
          <button
            onClick={scrollToBottom}
            className="absolute bottom-4 left-1/2 -translate-x-1/2 w-9 h-9 rounded-full bg-white border border-surface-container shadow-lg flex items-center justify-center hover:bg-surface-container transition-all cursor-pointer z-10"
            aria-label="Scroll to bottom"
          >
            <span className="material-symbols-outlined text-base text-secondary">
              keyboard_arrow_down
            </span>
          </button>
        )}
      </div>

      {/* Error banner */}
      {error && (
        <div className="border-t border-surface-container">
          <div className="max-w-3xl mx-auto px-4 py-2.5">
            <div className="px-4 py-2.5 rounded-lg bg-error-container text-on-error-container text-body-md flex items-center gap-2">
              <span className="material-symbols-outlined text-base">error</span>
              <span className="flex-1">{error}</span>
              <button
                onClick={onClearError}
                className="text-on-error-container/70 hover:text-on-error-container cursor-pointer"
              >
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Suggested actions (when messages exist but not streaming) */}
      {!isEmpty && !isStreaming && (
        <div className="border-t border-surface-container-low bg-surface-container-lowest">
          <SuggestedActions
            memory={memory}
            onAction={onSendMessage}
            visible={true}
          />
        </div>
      )}

      {/* Input */}
      <ChatInput onSend={onSendMessage} disabled={isStreaming} />
    </div>
  );
}
