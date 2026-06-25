'use client';

import { useState, useCallback, useRef } from 'react';
import type {
  ChatMessage,
  TripMemory,
  ConversationSummary,
  Conversation,
} from '@/types/chat';

interface UseChatReturn {
  messages: ChatMessage[];
  isStreaming: boolean;
  error: string | null;
  memory: TripMemory;
  conversations: ConversationSummary[];
  activeConversationId: string | null;
  sendMessage: (text: string) => Promise<void>;
  loadConversation: (id: string) => Promise<void>;
  createConversation: () => void;
  deleteConversation: (id: string) => Promise<void>;
  loadConversations: () => Promise<void>;
  loadMemory: () => Promise<void>;
  clearMemory: () => Promise<void>;
  clearError: () => void;
}

export function useChat(): UseChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [memory, setMemory] = useState<TripMemory>({});
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const clearError = useCallback(() => setError(null), []);

  // --- Load conversations list ---
  const loadConversations = useCallback(async () => {
    try {
      const res = await fetch('/api/conversation');
      if (res.ok) {
        const data = await res.json();
        // Handle both paginated response { conversations: [...] } and legacy flat array
        const convList = Array.isArray(data) ? data : (data.conversations || []);
        setConversations(convList);
      }
    } catch (err) {
      console.error('Failed to load conversations:', err);
    }
  }, []);

  // --- Load memory ---
  const loadMemory = useCallback(async (conversationId = activeConversationId) => {
    try {
      if (!conversationId) {
        setMemory({});
        return;
      }
      const res = await fetch(`/api/memory?conversationId=${encodeURIComponent(conversationId)}`);
      if (res.ok) {
        const data = await res.json();
        setMemory(data);
      }
    } catch (err) {
      console.error('Failed to load memory:', err);
    }
  }, [activeConversationId]);

  // --- Load a specific conversation ---
  const loadConversation = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/conversation/${encodeURIComponent(id)}`);
      if (res.ok) {
        const data: Conversation = await res.json();
        setMessages(data.messages);
        setActiveConversationId(data._id);
        if (data.memory) {
          setMemory(data.memory);
        }
      } else {
        setError('Failed to load conversation');
      }
    } catch (err) {
      console.error('Failed to load conversation:', err);
      setError('Failed to load conversation');
    }
  }, []);

  // --- Create new conversation ---
  const createConversation = useCallback(() => {
    setMessages([]);
    setActiveConversationId(null);
    setError(null);
  }, []);

  // --- Delete conversation ---
  const deleteConversation = useCallback(
    async (id: string) => {
      try {
        const res = await fetch(`/api/conversation/${encodeURIComponent(id)}`, {
          method: 'DELETE',
        });
        if (res.ok) {
          setConversations((prev) => prev.filter((c) => c._id !== id));
          if (activeConversationId === id) {
            setMessages([]);
            setActiveConversationId(null);
            setMemory({});
          }
        } else {
          setError('Failed to delete conversation');
        }
      } catch (err) {
        console.error('Failed to delete conversation:', err);
        setError('Failed to delete conversation');
      }
    },
    [activeConversationId]
  );

  // --- Clear memory ---
  const clearMemory = useCallback(async () => {
    try {
      if (!activeConversationId) {
        setMemory({});
        return;
      }
      const res = await fetch(`/api/memory?conversationId=${encodeURIComponent(activeConversationId)}`, { method: 'DELETE' });
      if (res.ok) {
        setMemory({});
      }
    } catch (err) {
      console.error('Failed to clear memory:', err);
    }
  }, [activeConversationId]);

  // --- Send message (with streaming) ---
  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isStreaming) return;

      setError(null);

      // Add user message immediately
      const userMessage: ChatMessage = {
        role: 'user',
        content: text.trim(),
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMessage]);

      // Add placeholder assistant message
      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: '',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);

      setIsStreaming(true);

      // Abort any previous request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: text.trim(),
            conversationId: activeConversationId,
          }),
          signal: abortControllerRef.current.signal,
        });

        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          throw new Error(errorData.error || `Request failed with status ${res.status}`);
        }

        if (!res.body) {
          throw new Error('No response body');
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let responseConversationId = activeConversationId;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          // Process complete SSE lines
          const lines = buffer.split('\n\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;

            try {
              const data = JSON.parse(line.slice(6));

              if (data.type === 'meta' && data.conversationId) {
                responseConversationId = data.conversationId;
                setActiveConversationId(data.conversationId);
              } else if (data.type === 'token' && data.content) {
                // Artificial delay to smooth out the typing speed from fast LLMs like Groq
                await new Promise((resolve) => setTimeout(resolve, 20));

                setMessages((prev) => {
                  const updated = [...prev];
                  const lastMsg = updated[updated.length - 1];
                  if (lastMsg && lastMsg.role === 'assistant') {
                    updated[updated.length - 1] = {
                      ...lastMsg,
                      content: lastMsg.content + data.content,
                    };
                  }
                  return updated;
                });
              } else if (data.type === 'error') {
                setError(data.error || 'An error occurred');
              } else if (data.type === 'done') {
                // Refresh memory and conversations after completion
                loadMemory(responseConversationId);
                loadConversations();
              }
            } catch {
              // Skip malformed JSON chunks
            }
          }
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          // Request was intentionally aborted
          return;
        }

        const errorMessage =
          err instanceof Error ? err.message : 'Failed to send message';
        setError(errorMessage);

        // Remove the empty assistant message on error
        setMessages((prev) => {
          const updated = [...prev];
          const lastMsg = updated[updated.length - 1];
          if (lastMsg && lastMsg.role === 'assistant' && lastMsg.content === '') {
            updated.pop();
          }
          return updated;
        });
      } finally {
        setIsStreaming(false);
        abortControllerRef.current = null;
      }
    },
    [isStreaming, activeConversationId, loadMemory, loadConversations]
  );

  return {
    messages,
    isStreaming,
    error,
    memory,
    conversations,
    activeConversationId,
    sendMessage,
    loadConversation,
    createConversation,
    deleteConversation,
    loadConversations,
    loadMemory,
    clearMemory,
    clearError,
  };
}
