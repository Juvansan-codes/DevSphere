'use client';

import { useSession, signOut } from 'next-auth/react';
import { useState, useEffect, useRef, useCallback, KeyboardEvent } from 'react';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useAITripPlanner } from '@/hooks/useAITripPlanner';
import type { AITripPlan, GeneratedPlan, DayPlan, Hotel, Restaurant, Transport } from '@/types/ai-trip-plan';

// Helpers
function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getCategoryIcon(cat?: string): string {
  switch (cat) {
    case 'sightseeing': return 'photo_camera';
    case 'dining': return 'restaurant';
    case 'activity': return 'directions_run';
    case 'transport': return 'directions_transit';
    case 'accommodation': return 'hotel';
    default: return 'place';
  }
}

// NewPlanModal
function NewPlanModal({ onClose, onCreate }: { onClose: () => void; onCreate: (dest: string) => Promise<boolean>; }) {
  const [destination, setDestination] = useState('');
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { inputRef.current?.focus(); }, []);
  const handleCreate = async () => {
    if (!destination.trim()) return;
    setLoading(true);
    const created = await onCreate(destination.trim());
    setLoading(false);
    if (created) onClose();
  };
  const handleKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleCreate();
    if (e.key === 'Escape') onClose();
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 border border-surface-container">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-primary-container flex items-center justify-center">
              <span className="material-symbols-outlined text-on-primary-container text-lg">travel_explore</span>
            </div>
            <h2 className="text-headline-md font-bold text-on-surface">New Trip Plan</h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-surface-container transition-colors cursor-pointer">
            <span className="material-symbols-outlined text-secondary text-base">close</span>
          </button>
        </div>
        <p className="text-body-md text-secondary mb-4">Where do you want to go? Vyora AI will craft the perfect itinerary.</p>
        <input ref={inputRef} type="text" value={destination} onChange={(e) => setDestination(e.target.value)} onKeyDown={handleKey}
          placeholder="e.g. Tokyo, Japan or Paris, France"
          className="w-full px-4 py-3 rounded-xl border border-surface-container-high bg-surface-container-low text-body-md text-on-surface placeholder:text-secondary/40 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all mb-4" />
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-surface-container text-body-md font-semibold text-secondary hover:bg-surface-container transition-colors cursor-pointer">Cancel</button>
          <button onClick={handleCreate} disabled={!destination.trim() || loading}
            className="flex-1 py-2.5 rounded-xl bg-primary-container text-on-primary-container text-body-md font-semibold hover:shadow-md transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2">
            {loading ? <span className="material-symbols-outlined text-base animate-spin">progress_activity</span> : <span className="material-symbols-outlined text-base">add</span>}
            {loading ? 'Creating...' : 'Create Plan'}
          </button>
        </div>
      </div>
    </div>
  );
}
// LeftSidebar
function LeftSidebar({ plans, loading, activePlanId, onSelect, onDelete, onNew, isOpen, onClose }: {
  plans: AITripPlan[]; loading: boolean; activePlanId: string | null;
  onSelect: (id: string) => void; onDelete: (id: string) => void;
  onNew: () => void; isOpen: boolean; onClose: () => void;
}) {
  const [search, setSearch] = useState('');
  const filtered = plans.filter(p =>
    p.title.toLowerCase().includes(search.toLowerCase()) ||
    p.destination.toLowerCase().includes(search.toLowerCase())
  );
  const getStatusDot = (s: string) =>
    s === 'finalized' ? 'bg-secondary' : s === 'archived' ? 'bg-secondary/40' : 'bg-primary-container';

  return (
    <>
      {isOpen && <div className="fixed inset-0 bg-black/20 z-40 lg:hidden" onClick={onClose} />}
      <div className={`fixed left-0 top-0 h-full w-72 bg-white border-r border-surface-container z-50 flex flex-col transition-transform duration-200 shadow-xl lg:static lg:z-auto lg:shadow-none lg:w-56 xl:w-64 lg:bg-surface-container-lowest lg:h-full lg:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-surface-container flex-shrink-0">
          <h3 className="text-label-md font-bold text-on-surface uppercase tracking-wider">Trip Plans</h3>
          <div className="flex items-center gap-1">
            <button onClick={onNew} className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-surface-container transition-colors cursor-pointer" title="New plan">
              <span className="material-symbols-outlined text-base text-primary">add</span>
            </button>
            <button onClick={onClose} className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-surface-container transition-colors cursor-pointer lg:hidden">
              <span className="material-symbols-outlined text-base text-secondary">close</span>
            </button>
          </div>
        </div>
        <div className="px-3 py-2.5 border-b border-surface-container flex-shrink-0">
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface-container border border-transparent focus-within:border-primary/30 focus-within:bg-white transition-all">
            <span className="material-symbols-outlined text-sm text-secondary/50">search</span>
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search plans..."
              className="flex-1 text-body-md bg-transparent text-on-surface placeholder:text-secondary/40 focus:outline-none" />
            {search && <button onClick={() => setSearch('')} className="text-secondary/40 hover:text-secondary cursor-pointer"><span className="material-symbols-outlined text-sm">close</span></button>}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto py-2">
          {loading ? (
            <div className="flex items-center justify-center py-8"><span className="material-symbols-outlined text-primary animate-spin">progress_activity</span></div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-10 px-4">
              <span className="material-symbols-outlined text-4xl text-secondary/20 mb-3 block">travel_explore</span>
              <p className="text-body-md text-secondary/50 mb-1">{search ? 'No matching plans' : 'No trip plans yet'}</p>
              {!search && <p className="text-label-sm text-secondary/40">Create your first AI plan above!</p>}
            </div>
          ) : filtered.map((plan) => (
            <div key={plan._id} className={`group mx-2 px-3 py-2.5 rounded-lg cursor-pointer transition-colors relative ${activePlanId === plan._id ? 'bg-primary-container/15 text-primary' : 'hover:bg-surface-container text-on-surface'}`}
              onClick={() => { onSelect(plan._id); onClose(); }}>
              <div className="flex items-start gap-2">
                <span className={`w-2 h-2 rounded-full flex-shrink-0 mt-1.5 ${getStatusDot(plan.status)}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-body-md font-semibold truncate leading-snug">{plan.title}</p>
                  <p className="text-label-sm text-secondary/50 truncate flex items-center gap-1">
                    <span className="material-symbols-outlined text-xs">location_on</span>{plan.destination}
                  </p>
                  <p className="text-label-sm text-secondary/40 mt-0.5">{timeAgo(plan.updatedAt)}</p>
                </div>
                <button onClick={(e) => { e.stopPropagation(); onDelete(plan._id); }}
                  className="w-6 h-6 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-error/10 hover:text-error transition-all cursor-pointer flex-shrink-0">
                  <span className="material-symbols-outlined text-sm">delete</span>
                </button>
              </div>
            </div>
          ))}
        </div>
        <div className="px-3 py-3 border-t border-surface-container flex-shrink-0">
          <button onClick={onNew} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary-container text-on-primary-container text-label-md font-semibold hover:shadow-md transition-all active:scale-[0.97] cursor-pointer">
            <span className="material-symbols-outlined text-base">add</span>New Trip Plan
          </button>
        </div>
      </div>
    </>
  );
}
// ChatArea
function ChatArea({ activePlan, messages, isStreaming, error, onSend, onClearError }: {
  activePlan: AITripPlan | null;
  messages: Array<{ role: 'user' | 'assistant'; content: string; timestamp: Date }>;
  isStreaming: boolean; error: string | null;
  onSend: (text: string) => void; onClearError: () => void;
}) {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showScrollBtn, setShowScrollBtn] = useState(false);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, isStreaming]);
  useEffect(() => {
    const ta = textareaRef.current;
    if (ta) { ta.style.height = 'auto'; ta.style.height = `${Math.min(ta.scrollHeight, 160)}px`; }
  }, [input]);
  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const h = () => setShowScrollBtn(el.scrollHeight - el.scrollTop - el.clientHeight > 100);
    el.addEventListener('scroll', h);
    return () => el.removeEventListener('scroll', h);
  }, []);

  const handleSend = () => {
    if (!input.trim() || isStreaming) return;
    onSend(input.trim());
    setInput('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  };
  const handleKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const suggestedPrompts = activePlan ? [
    `Plan a detailed itinerary for ${activePlan.destination}`,
    `What is the best budget for ${activePlan.destination}?`,
    `Recommend top hotels in ${activePlan.destination}`,
    `What are must-see attractions in ${activePlan.destination}?`,
  ] : [];

  const isEmpty = messages.length === 0;

  return (
    <div className="flex flex-col h-full bg-white min-w-0">
      <div className="flex-shrink-0 px-5 py-3.5 border-b border-surface-container bg-white">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary-container/20 flex items-center justify-center">
            <span className="material-symbols-outlined text-primary text-lg">travel_explore</span>
          </div>
          <div>
            <h1 className="text-headline-md font-bold text-on-surface leading-tight">
              {activePlan ? activePlan.title : 'AI Trip Planner'}
            </h1>
            <p className="text-label-sm text-secondary">
              {activePlan ? `Planning trip to ${activePlan.destination}` : 'Select or create a trip plan to get started'}
            </p>
          </div>
        </div>
      </div>

      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto relative">
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center h-full px-6 py-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-primary-container/20 flex items-center justify-center mb-5">
              <span className="material-symbols-outlined text-4xl text-primary">{activePlan ? 'chat' : 'travel_explore'}</span>
            </div>
            {activePlan ? (
              <>
                <h2 className="text-headline-md font-bold text-on-surface mb-2">Start planning {activePlan.destination}</h2>
                <p className="text-body-lg text-secondary max-w-sm mb-8 leading-relaxed">
                  Tell me your budget, dates, travel style — and I will create the perfect itinerary.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg">
                  {suggestedPrompts.map((prompt) => (
                    <button key={prompt} onClick={() => onSend(prompt)}
                      className="text-left px-4 py-3 rounded-xl border border-surface-container hover:border-primary/30 hover:bg-primary-container/5 transition-all text-body-md text-on-surface cursor-pointer">
                      {prompt}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <>
                <h2 className="text-headline-md font-bold text-on-surface mb-2">Plan Your Trip with AI</h2>
                <p className="text-body-lg text-secondary max-w-sm leading-relaxed">
                  Create a new trip plan or select an existing one from the sidebar to start chatting with Vyora AI.
                </p>
              </>
            )}
          </div>
        ) : (
          <div className="max-w-3xl mx-auto py-5 space-y-1 px-4">
            {messages.map((msg, idx) => {
              const isUser = msg.role === 'user';
              const isLastAssistant = isStreaming && idx === messages.length - 1 && msg.role === 'assistant';
              if (msg.role === 'assistant' && !msg.content && !isLastAssistant) return null;
              return (
                <div key={idx} className={`flex items-start gap-3 py-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${isUser ? 'bg-on-surface text-background' : 'bg-primary-container text-on-primary-container'}`}>
                    <span className="material-symbols-outlined text-sm">{isUser ? 'person' : 'travel_explore'}</span>
                  </div>
                  <div className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-3 text-body-md leading-relaxed ${isUser ? 'bg-on-surface text-background rounded-tr-sm' : 'bg-surface-container-low text-on-surface rounded-tl-sm'} ${isLastAssistant ? 'streaming-message' : ''}`}>
                    {isUser ? (
                      <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                    ) : msg.content ? (
                      <div className="prose prose-sm max-w-none">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 py-1">
                        <span className="typing-dot" style={{ animationDelay: '0ms' }} />
                        <span className="typing-dot" style={{ animationDelay: '160ms' }} />
                        <span className="typing-dot" style={{ animationDelay: '320ms' }} />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
        {showScrollBtn && (
          <button onClick={() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })}
            className="absolute bottom-4 left-1/2 -translate-x-1/2 w-9 h-9 rounded-full bg-white border border-surface-container shadow-lg flex items-center justify-center hover:bg-surface-container transition-all cursor-pointer z-10">
            <span className="material-symbols-outlined text-base text-secondary">keyboard_arrow_down</span>
          </button>
        )}
      </div>

      {error && (
        <div className="border-t border-surface-container px-4 py-2">
          <div className="max-w-3xl mx-auto px-4 py-2.5 rounded-lg bg-error-container text-on-error-container text-body-md flex items-center gap-2">
            <span className="material-symbols-outlined text-base">error</span>
            <span className="flex-1">{error}</span>
            <button onClick={onClearError} className="cursor-pointer hover:opacity-70"><span className="material-symbols-outlined text-base">close</span></button>
          </div>
        </div>
      )}

      <div className="border-t border-surface-container bg-white px-4 py-3 flex-shrink-0">
        <div className="flex items-end gap-3 max-w-3xl mx-auto">
          <div className="flex-1">
            <textarea ref={textareaRef} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKey}
              placeholder={activePlan ? `Ask about ${activePlan.destination}...` : 'Select a trip plan to start chatting...'}
              disabled={isStreaming || !activePlan} rows={1}
              className="w-full resize-none rounded-xl border border-surface-container-high bg-surface-container-low px-4 py-3 text-body-md text-on-surface placeholder:text-secondary/40 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ maxHeight: '160px' }} />
          </div>
          <button onClick={handleSend} disabled={isStreaming || !input.trim() || !activePlan}
            className="flex items-center justify-center w-11 h-11 rounded-xl bg-primary-container text-on-primary-container hover:shadow-md transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0 cursor-pointer">
            {isStreaming ? <span className="material-symbols-outlined text-xl animate-spin">progress_activity</span> : <span className="material-symbols-outlined text-xl">arrow_upward</span>}
          </button>
        </div>
        <p className="text-center text-label-sm text-secondary/30 mt-1.5 max-w-3xl mx-auto">Enter to send · Shift+Enter for new line</p>
      </div>
    </div>
  );
}
// RightPreview
function RightPreview({ plan }: { plan: GeneratedPlan | null }) {
  const [activeTab, setActiveTab] = useState<'overview' | 'days' | 'stay' | 'transport'>('overview');

  if (!plan || Object.keys(plan).length === 0) {
    return (
      <div className="h-full w-full bg-surface-container-lowest border-l border-surface-container flex flex-col">
        <div className="flex-shrink-0 px-4 py-3.5 border-b border-surface-container">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-base">auto_awesome</span>
            <h3 className="text-label-md font-bold text-on-surface uppercase tracking-wider">Live Trip Preview</h3>
          </div>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center px-5 text-center">
          <div className="w-14 h-14 rounded-2xl bg-surface-container flex items-center justify-center mb-4">
            <span className="material-symbols-outlined text-3xl text-secondary/30">map</span>
          </div>
          <p className="text-body-md font-semibold text-on-surface/60 mb-1">No plan yet</p>
          <p className="text-label-md text-secondary/40 leading-relaxed">Start chatting and your trip details will appear here in real-time.</p>
        </div>
      </div>
    );
  }

  const extendedPlan = plan as GeneratedPlan & { travelStyle?: string };
  const tabs = [
    { id: 'overview' as const, label: 'Overview', icon: 'summarize' },
    { id: 'days' as const, label: 'Days', icon: 'calendar_today' },
    { id: 'stay' as const, label: 'Stay & Eat', icon: 'hotel' },
    { id: 'transport' as const, label: 'Transport', icon: 'directions_transit' },
  ];

  return (
    <div className="h-full w-full bg-surface-container-lowest border-l border-surface-container flex flex-col min-w-0">
      <div className="flex-shrink-0 px-4 py-3.5 border-b border-surface-container">
        <div className="flex items-center gap-2 mb-2.5">
          <span className="material-symbols-outlined text-primary text-base">auto_awesome</span>
          <h3 className="text-label-md font-bold text-on-surface uppercase tracking-wider">Live Trip Preview</h3>
        </div>
        {plan.destination && (
          <div>
            <p className="text-body-md font-bold text-on-surface leading-tight">{plan.destination}</p>
            <div className="flex flex-wrap items-center gap-2 mt-1.5">
              {plan.duration && <span className="flex items-center gap-1 text-label-sm text-secondary font-mono"><span className="material-symbols-outlined text-xs">schedule</span>{plan.duration} days</span>}
              {plan.budget && plan.budget.amount !== undefined && <span className="flex items-center gap-1 text-label-sm text-secondary font-mono"><span className="material-symbols-outlined text-xs">payments</span>{plan.budget.currency} {Number(plan.budget.amount).toLocaleString()}</span>}
              {extendedPlan.travelStyle && <span className="px-2 py-0.5 rounded-full bg-primary-container/15 text-primary text-[10px] font-bold uppercase tracking-wider">{extendedPlan.travelStyle}</span>}
            </div>
          </div>
        )}
      </div>

      <div className="flex-shrink-0 flex border-b border-surface-container bg-white">
        {tabs.map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex flex-col items-center py-2 text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer ${activeTab === tab.id ? 'text-primary border-b-2 border-primary' : 'text-secondary hover:text-on-surface'}`}>
            <span className="material-symbols-outlined text-sm mb-0.5">{tab.icon}</span>{tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">
        {activeTab === 'overview' && (
          <div className="p-4 space-y-4">
            {plan.overview && (
              <div className="p-3 rounded-xl bg-white border border-surface-container">
                <p className="text-label-md font-bold text-on-surface/60 uppercase tracking-wider mb-1.5">Overview</p>
                <p className="text-body-md text-on-surface leading-relaxed">{plan.overview}</p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-2">
              {plan.duration && <div className="p-3 rounded-xl bg-white border border-surface-container text-center"><span className="material-symbols-outlined text-primary text-xl block mb-1">calendar_today</span><p className="text-headline-md font-bold text-on-surface">{plan.duration}</p><p className="text-label-sm text-secondary">Days</p></div>}
              {plan.budget && plan.budget.amount !== undefined && <div className="p-3 rounded-xl bg-white border border-surface-container text-center"><span className="material-symbols-outlined text-primary text-xl block mb-1">payments</span><p className="text-headline-md font-bold text-on-surface font-mono">{Number(plan.budget.amount).toLocaleString()}</p><p className="text-label-sm text-secondary">{plan.budget.currency}</p></div>}
              {plan.hotels && <div className="p-3 rounded-xl bg-white border border-surface-container text-center"><span className="material-symbols-outlined text-primary text-xl block mb-1">hotel</span><p className="text-headline-md font-bold text-on-surface">{plan.hotels.length}</p><p className="text-label-sm text-secondary">Hotels</p></div>}
              {plan.restaurants && <div className="p-3 rounded-xl bg-white border border-surface-container text-center"><span className="material-symbols-outlined text-primary text-xl block mb-1">restaurant</span><p className="text-headline-md font-bold text-on-surface">{plan.restaurants.length}</p><p className="text-label-sm text-secondary">Restaurants</p></div>}
            </div>
            {plan.totalEstimatedCost && (
              <div className="p-3 rounded-xl bg-primary-container/10 border border-primary-container/30">
                <p className="text-label-sm text-secondary/60 font-semibold uppercase tracking-wider mb-1">Total Estimated Cost</p>
                <p className="text-headline-md font-bold text-primary">
                  {plan.totalEstimatedCost.replace(/\b\d+(?:\.\d+)?\b/g, (match) => Number(match).toLocaleString())}
                </p>
              </div>
            )}
            {plan.notes && (
              <div className="p-3 rounded-xl bg-white border border-surface-container">
                <p className="text-label-md font-bold text-on-surface/60 uppercase tracking-wider mb-1.5 flex items-center gap-1"><span className="material-symbols-outlined text-sm">sticky_note_2</span>Notes</p>
                <p className="text-body-md text-secondary leading-relaxed">{plan.notes}</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'days' && (
          <div className="p-4 space-y-3">
            {!plan.days || plan.days.length === 0 ? (
              <div className="text-center py-8"><span className="material-symbols-outlined text-4xl text-secondary/20 block mb-2">calendar_today</span><p className="text-body-md text-secondary/40">No day plans yet</p></div>
            ) : plan.days.map((day: DayPlan) => (
              <div key={day.day} className="bg-white border border-surface-container rounded-xl overflow-hidden">
                <div className="flex items-center gap-2 px-3 py-2.5 bg-surface-container-lowest border-b border-surface-container">
                  <div className="w-7 h-7 rounded-full bg-primary-container flex items-center justify-center flex-shrink-0">
                    <span className="text-on-primary-container text-xs font-bold">{day.day}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-body-md font-semibold text-on-surface truncate">{day.title || `Day ${day.day}`}</p>
                    {day.estimatedCost && <p className="text-label-sm text-secondary font-mono">{day.estimatedCost}</p>}
                  </div>
                </div>
                <div className="p-3 space-y-2">
                  {(day.activities ?? []).map((activity, aIdx) => (
                    <div key={aIdx} className="flex items-start gap-2">
                      <span className="material-symbols-outlined text-sm text-primary/60 flex-shrink-0 mt-0.5">{getCategoryIcon(activity.category)}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-body-md font-medium text-on-surface leading-snug">{activity.name}</p>
                        <div className="flex flex-wrap gap-2 mt-0.5">
                          {activity.time && <span className="text-label-sm text-secondary font-mono">{activity.time}</span>}
                          {activity.duration && <span className="text-label-sm text-secondary">{activity.duration}</span>}
                          {activity.cost && <span className="text-label-sm text-primary font-mono font-semibold">{activity.cost}</span>}
                        </div>
                        {activity.location && <p className="text-label-sm text-secondary/60 flex items-center gap-0.5 mt-0.5"><span className="material-symbols-outlined text-xs">location_on</span>{activity.location}</p>}
                      </div>
                    </div>
                  ))}
                  {(!day.activities || day.activities.length === 0) && (
                    <p className="text-label-sm text-secondary/40">No activities added for this day yet</p>
                  )}
                  {day.notes && <p className="text-label-sm text-secondary/60 italic border-t border-surface-container pt-2 mt-2">{day.notes}</p>}
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'stay' && (
          <div className="p-4 space-y-4">
            {plan.hotels && plan.hotels.length > 0 && (
              <div>
                <p className="text-label-md font-bold text-on-surface/60 uppercase tracking-wider mb-2 flex items-center gap-1"><span className="material-symbols-outlined text-sm">hotel</span>Hotels</p>
                <div className="space-y-2">
                  {plan.hotels.map((hotel: Hotel, idx: number) => (
                    <div key={idx} className="bg-white border border-surface-container rounded-xl p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0"><p className="text-body-md font-semibold text-on-surface">{hotel.name}</p>{hotel.type && <p className="text-label-sm text-secondary">{hotel.type}</p>}</div>
                        {hotel.pricePerNight && <span className="text-label-sm font-bold text-primary font-mono whitespace-nowrap">{hotel.pricePerNight}/night</span>}
                      </div>
                      {hotel.location && <p className="text-label-sm text-secondary/60 flex items-center gap-0.5 mt-1"><span className="material-symbols-outlined text-xs">location_on</span>{hotel.location}</p>}
                      {hotel.amenities && hotel.amenities.length > 0 && <div className="flex flex-wrap gap-1 mt-2">{hotel.amenities.map((a, ai) => <span key={ai} className="px-1.5 py-0.5 rounded-md bg-surface-container text-label-sm text-secondary">{a}</span>)}</div>}
                      {hotel.notes && <p className="text-label-sm text-secondary/50 italic mt-1.5">{hotel.notes}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {plan.restaurants && plan.restaurants.length > 0 && (
              <div>
                <p className="text-label-md font-bold text-on-surface/60 uppercase tracking-wider mb-2 flex items-center gap-1"><span className="material-symbols-outlined text-sm">restaurant</span>Restaurants</p>
                <div className="space-y-2">
                  {plan.restaurants.map((rest: Restaurant, idx: number) => (
                    <div key={idx} className="bg-white border border-surface-container rounded-xl p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0"><p className="text-body-md font-semibold text-on-surface">{rest.name}</p>{rest.cuisine && <p className="text-label-sm text-secondary">{rest.cuisine}</p>}</div>
                        {rest.priceRange && <span className="text-label-sm font-bold text-primary">{rest.priceRange}</span>}
                      </div>
                      {rest.location && <p className="text-label-sm text-secondary/60 flex items-center gap-0.5 mt-1"><span className="material-symbols-outlined text-xs">location_on</span>{rest.location}</p>}
                      {rest.speciality && <p className="text-label-sm text-secondary/70 mt-1"><span className="font-semibold">Try: </span>{rest.speciality}</p>}
                      {rest.notes && <p className="text-label-sm text-secondary/50 italic mt-1">{rest.notes}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {(!plan.hotels || plan.hotels.length === 0) && (!plan.restaurants || plan.restaurants.length === 0) && (
              <div className="text-center py-8"><span className="material-symbols-outlined text-4xl text-secondary/20 block mb-2">hotel</span><p className="text-body-md text-secondary/40">No stay or dining info yet</p></div>
            )}
          </div>
        )}

        {activeTab === 'transport' && (
          <div className="p-4 space-y-3">
            {!plan.transport || plan.transport.length === 0 ? (
              <div className="text-center py-8"><span className="material-symbols-outlined text-4xl text-secondary/20 block mb-2">directions_transit</span><p className="text-body-md text-secondary/40">No transport info yet</p></div>
            ) : plan.transport.map((t: Transport, idx: number) => (
              <div key={idx} className="bg-white border border-surface-container rounded-xl p-3">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 rounded-full bg-surface-container flex items-center justify-center">
                    <span className="material-symbols-outlined text-sm text-secondary">
                      {t.type.toLowerCase().includes('flight') ? 'flight' : t.type.toLowerCase().includes('train') ? 'train' : t.type.toLowerCase().includes('bus') ? 'directions_bus' : t.type.toLowerCase().includes('taxi') ? 'local_taxi' : t.type.toLowerCase().includes('metro') ? 'subway' : 'directions_transit'}
                    </span>
                  </div>
                  <span className="text-body-md font-semibold text-on-surface">{t.type}</span>
                  {t.cost && <span className="ml-auto text-label-sm font-bold text-primary font-mono">{t.cost}</span>}
                </div>
                {(t.from || t.to) && (
                  <div className="flex items-center gap-2 text-body-md text-secondary mb-1">
                    {t.from && <span className="font-medium text-on-surface">{t.from}</span>}
                    {t.from && t.to && <span className="material-symbols-outlined text-sm text-secondary">arrow_forward</span>}
                    {t.to && <span className="font-medium text-on-surface">{t.to}</span>}
                  </div>
                )}
                {t.duration && <p className="text-label-sm text-secondary font-mono">{t.duration}</p>}
                {t.bookingInfo && <p className="text-label-sm text-secondary/70 mt-1.5"><span className="font-semibold">Book: </span>{t.bookingInfo}</p>}
                {t.notes && <p className="text-label-sm text-secondary/50 italic mt-1">{t.notes}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

// Main Page Content
function AITripPlannerContent() {
  const { data: session, status } = useSession();
  const searchParams = useSearchParams();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  
  // Auto-open modal if ?new=true is in URL
  const [showModal, setShowModal] = useState(searchParams.get('new') === 'true');

  const {
    plans, loadingPlans, fetchPlans,
    activePlan, messages, isStreaming, error, generatedPlan,
    openPlan, createPlan, deletePlan, sendMessage, clearError,
  } = useAITripPlanner();

  useEffect(() => {
    if (status === 'authenticated') {
      fetchPlans().then(() => {
        const planId = searchParams.get('planId');
        if (planId) {
          openPlan(planId);
        }
      });
    }
  }, [status, fetchPlans, searchParams, openPlan]);

  const handleCreatePlan = useCallback(async (destination: string) => {
    const plan = await createPlan(destination);
    return Boolean(plan);
  }, [createPlan]);

  if (status === 'loading') {
    return (
      <div className="flex h-screen items-center justify-center bg-surface text-sm uppercase tracking-widest text-secondary font-semibold font-sans">
        <span className="material-symbols-outlined text-primary text-3xl animate-spin mr-2">progress_activity</span>
        Loading...
      </div>
    );
  }
  if (status === 'unauthenticated') return null;

  return (
    <div className="h-screen flex flex-col bg-surface font-sans overflow-hidden">
      {/* Nav */}
      <nav className="bg-white border-b border-surface-container flex-shrink-0 z-30">
        <div className="w-full px-4 lg:px-6">
          <div className="flex h-14 justify-between items-center">
            <div className="flex items-center gap-3">
              <button onClick={() => setSidebarOpen(!sidebarOpen)} className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-surface-container transition-colors cursor-pointer lg:hidden" aria-label="Toggle sidebar">
                <span className="material-symbols-outlined text-on-surface">menu</span>
              </button>
              <Link href="/dashboard" className="flex items-center gap-2 group">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/logo.svg" alt="Vyora Logo" className="w-6 h-6 group-hover:scale-105 transition-transform" />
                <span className="font-display text-lg font-bold text-on-surface tracking-tight">Vyora</span>
              </Link>
              <span className="text-surface-container-high mx-1 hidden sm:inline">|</span>
              <div className="hidden sm:flex items-center gap-1.5">
                <span className="material-symbols-outlined text-primary text-base">auto_awesome</span>
                <span className="text-body-md font-semibold text-on-surface">AI Trip Planner</span>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <button onClick={() => setPreviewOpen(!previewOpen)} className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-surface-container transition-colors cursor-pointer xl:hidden" aria-label="Toggle preview">
                <span className="material-symbols-outlined text-on-surface">map</span>
              </button>
              <div className="hidden sm:flex items-center gap-2 border-l border-surface-container pl-3">
                <span className="w-7 h-7 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-bold text-xs uppercase shadow-sm">
                  {session?.user?.name?.[0] || session?.user?.email?.[0] || 'U'}
                </span>
                <span className="text-label-md font-semibold text-on-surface hidden md:inline">
                  {session?.user?.name || session?.user?.email}
                </span>
              </div>
              <button onClick={() => signOut({ callbackUrl: '/' })} className="text-label-md font-semibold text-secondary hover:text-primary transition-colors cursor-pointer">
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Content */}
      <div className="flex flex-1 min-h-0">
        {/* Left Sidebar Desktop */}
        <div className="hidden lg:flex flex-shrink-0">
          <LeftSidebar plans={plans} loading={loadingPlans} activePlanId={activePlan?._id ?? null}
            onSelect={openPlan} onDelete={deletePlan} onNew={() => setShowModal(true)}
            isOpen={true} onClose={() => {}} />
        </div>
        {/* Left Sidebar Mobile */}
        <div className="lg:hidden">
          <LeftSidebar plans={plans} loading={loadingPlans} activePlanId={activePlan?._id ?? null}
            onSelect={openPlan} onDelete={deletePlan}
            onNew={() => { setSidebarOpen(false); setShowModal(true); }}
            isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        </div>

        {/* Chat */}
        <div className="flex-1 flex flex-col min-w-0 min-h-0">
          <ChatArea activePlan={activePlan} messages={messages} isStreaming={isStreaming}
            error={error} onSend={sendMessage} onClearError={clearError} />
        </div>

        {/* Right Preview Desktop */}
        <div className="hidden xl:flex flex-shrink-0 w-64 2xl:w-72">
          <RightPreview plan={generatedPlan} />
        </div>

        {/* Right Preview Mobile Overlay */}
        {previewOpen && (
          <div className="xl:hidden fixed inset-0 z-50 flex">
            <div className="flex-1" onClick={() => setPreviewOpen(false)} />
            <div className="w-80 h-full shadow-2xl flex flex-col">
              <RightPreview plan={generatedPlan} />
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <NewPlanModal onClose={() => setShowModal(false)} onCreate={handleCreatePlan} />
      )}
    </div>
  );
}

export default function AITripPlannerPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center bg-surface text-sm uppercase tracking-widest text-secondary font-semibold font-sans">
        <span className="material-symbols-outlined text-primary text-3xl animate-spin mr-2">progress_activity</span>
        Loading...
      </div>
    }>
      <AITripPlannerContent />
    </Suspense>
  );
}
