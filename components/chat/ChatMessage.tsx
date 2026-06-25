'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/cjs/styles/prism';
import type { ChatMessage as ChatMessageType } from '@/types/chat';

interface ChatMessageProps {
  message: ChatMessageType;
  isStreaming?: boolean;
}

export default function ChatMessage({ message, isStreaming }: ChatMessageProps) {
  const isUser = message.role === 'user';

  if (message.role === 'system') return null;

  return (
    <div
      className={`flex items-start gap-3 py-3 ${
        isUser ? 'flex-row-reverse' : 'flex-row'
      }`}
    >
      {/* Avatar */}
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
          isUser
            ? 'bg-on-surface text-background'
            : 'bg-primary-container text-on-primary-container'
        }`}
      >
        <span className="material-symbols-outlined text-sm">
          {isUser ? 'person' : 'travel_explore'}
        </span>
      </div>

      {/* Message Bubble */}
      <div
        className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-3 text-body-md leading-relaxed ${
          isUser
            ? 'bg-on-surface text-background rounded-tr-sm'
            : 'bg-surface-container-low text-on-surface rounded-tl-sm'
        } ${isStreaming ? 'streaming-message' : ''}`}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap break-words">{message.content}</p>
        ) : message.content ? (
          <div className="prose prose-sm max-w-none">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                code({ className, children, ...props }) {
                  const match = /language-(\w+)/.exec(className || '');
                  return match ? (
                    <SyntaxHighlighter
                      {...props as any}
                      style={oneDark}
                      language={match[1]}
                      PreTag="div"
                    >
                      {String(children).replace(/\n$/, '')}
                    </SyntaxHighlighter>
                  ) : (
                    <code className={className} {...props}>
                      {children}
                    </code>
                  );
                },
              }}
            >
              {message.content}
            </ReactMarkdown>
          </div>
        ) : null}
      </div>
    </div>
  );
}
