'use client';

import { useState, useCallback, useRef } from 'react';
import type { AITripPlan, GeneratedPlan } from '@/types/ai-trip-plan';

interface PlannerMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface UseAITripPlannerReturn {
  // Plans list
  plans: AITripPlan[];
  loadingPlans: boolean;
  fetchPlans: (search?: string) => Promise<void>;

  // Active plan
  activePlan: AITripPlan | null;
  messages: PlannerMessage[];
  isStreaming: boolean;
  error: string | null;
  generatedPlan: GeneratedPlan | null;

  // Actions
  openPlan: (id: string) => Promise<void>;
  createPlan: (destination: string) => Promise<AITripPlan | null>;
  deletePlan: (id: string) => Promise<void>;
  sendMessage: (text: string) => Promise<void>;
  startNew: () => void;
  clearError: () => void;
}

export function useAITripPlanner(): UseAITripPlannerReturn {
  const [plans, setPlans] = useState<AITripPlan[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [activePlan, setActivePlan] = useState<AITripPlan | null>(null);
  const [messages, setMessages] = useState<PlannerMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedPlan, setGeneratedPlan] = useState<GeneratedPlan | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const clearError = useCallback(() => setError(null), []);

  // Fetch all plans (with optional search)
  const fetchPlans = useCallback(async (search?: string) => {
    setLoadingPlans(true);
    try {
      const params = new URLSearchParams({ limit: '50' });
      if (search?.trim()) params.set('search', search.trim());
      const res = await fetch(`/api/ai-trip-plans?${params}`);
      if (res.ok) {
        const data = await res.json();
        setPlans(data.plans ?? []);
      }
    } catch (err) {
      console.error('Failed to fetch AI trip plans:', err);
    } finally {
      setLoadingPlans(false);
    }
  }, []);

  // Open an existing plan and load its messages
  const openPlan = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/ai-trip-plans/${encodeURIComponent(id)}`);
      if (!res.ok) throw new Error('Failed to load plan');
      const data: AITripPlan = await res.json();
      setActivePlan(data);
      setMessages(
        (data.messages ?? [])
          .filter((m) => m.role !== 'system')
          .map((m) => ({
            role: m.role as 'user' | 'assistant',
            content: m.content,
            timestamp: new Date(m.timestamp),
          }))
      );
      setGeneratedPlan(data.generatedPlan ?? null);
      setError(null);
    } catch (err) {
      setError('Failed to load plan');
      console.error(err);
    }
  }, []);

  // Create a new trip plan
  const createPlan = useCallback(async (destination: string): Promise<AITripPlan | null> => {
    try {
      const res = await fetch('/api/ai-trip-plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ destination }),
      });
      if (!res.ok) throw new Error('Failed to create plan');
      const data: AITripPlan = await res.json();
      setPlans((prev) => [data, ...prev]);
      setActivePlan(data);
      setMessages([]);
      setGeneratedPlan(null);
      setError(null);
      return data;
    } catch (err) {
      setError('Failed to create trip plan');
      console.error(err);
      return null;
    }
  }, []);

  // Delete a plan
  const deletePlan = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/ai-trip-plans/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete plan');
      setPlans((prev) => prev.filter((p) => p._id !== id));
      if (activePlan?._id === id) {
        setActivePlan(null);
        setMessages([]);
        setGeneratedPlan(null);
      }
    } catch (err) {
      setError('Failed to delete plan');
      console.error(err);
    }
  }, [activePlan]);

  // Send a message and stream the response
  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isStreaming || !activePlan) return;

    setError(null);

    const userMsg: PlannerMessage = { role: 'user', content: text.trim(), timestamp: new Date() };
    setMessages((prev) => [...prev, userMsg]);

    const assistantMsg: PlannerMessage = { role: 'assistant', content: '', timestamp: new Date() };
    setMessages((prev) => [...prev, assistantMsg]);

    setIsStreaming(true);

    if (abortControllerRef.current) abortControllerRef.current.abort();
    abortControllerRef.current = new AbortController();

    try {
      const res = await fetch(
        `/api/ai-trip-plans/${encodeURIComponent(activePlan._id)}/chat`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: text.trim() }),
          signal: abortControllerRef.current.signal,
        }
      );

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Request failed: ${res.status}`);
      }

      if (!res.body) throw new Error('No response body');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const data = JSON.parse(line.slice(6));

            if (data.type === 'token' && data.content) {
              // Small delay to smooth streaming
              await new Promise((r) => setTimeout(r, 15));
              setMessages((prev) => {
                const updated = [...prev];
                const last = updated[updated.length - 1];
                if (last?.role === 'assistant') {
                  updated[updated.length - 1] = { ...last, content: last.content + data.content };
                }
                return updated;
              });
            } else if (data.type === 'plan_update' && data.planUpdate) {
              setGeneratedPlan((prev) => ({ ...(prev ?? {}), ...data.planUpdate }));
              setActivePlan((prev) =>
                prev && prev._id === activePlan._id
                  ? { ...prev, generatedPlan: { ...(prev.generatedPlan ?? {}), ...data.planUpdate } }
                  : prev
              );
              // Also update the active plan in sidebar list
              setPlans((prev) =>
                prev.map((p) =>
                  p._id === activePlan._id
                    ? { ...p, generatedPlan: { ...(p.generatedPlan ?? {}), ...data.planUpdate } }
                    : p
                )
              );
            } else if (data.type === 'error') {
              setError(data.error || 'An error occurred');
            }
          } catch {
            // Skip malformed chunks
          }
        }
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      const errMsg = err instanceof Error ? err.message : 'Failed to send message';
      setError(errMsg);
      // Remove empty assistant message on error
      setMessages((prev) => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last?.role === 'assistant' && last.content === '') updated.pop();
        return updated;
      });
    } finally {
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  }, [isStreaming, activePlan]);

  // Reset to no active plan
  const startNew = useCallback(() => {
    setActivePlan(null);
    setMessages([]);
    setGeneratedPlan(null);
    setError(null);
  }, []);

  return {
    plans,
    loadingPlans,
    fetchPlans,
    activePlan,
    messages,
    isStreaming,
    error,
    generatedPlan,
    openPlan,
    createPlan,
    deletePlan,
    sendMessage,
    startNew,
    clearError,
  };
}
