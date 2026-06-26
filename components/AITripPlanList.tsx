'use client';

import { AITripPlan } from '@/types/ai-trip-plan';
import AITripPlanCard from './AITripPlanCard';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import QuickPreviewModal from './QuickPreviewModal';

interface AITripPlanListProps {
  plans: AITripPlan[];
  onPlanUpdated: () => void;
}

export default function AITripPlanList({ plans, onPlanUpdated }: AITripPlanListProps) {
  const router = useRouter();
  const [previewPlanId, setPreviewPlanId] = useState<string | null>(null);

  const handlePreview = (planId: string) => {
    setPreviewPlanId(planId);
  };

  const handleExport = (planId: string) => {
    window.open(`/dashboard/ai-planner/print/${encodeURIComponent(planId)}`, '_blank');
  };

  const handleContinue = (planId: string) => {
    router.push(`/dashboard/ai-planner?planId=${encodeURIComponent(planId)}`);
  };

  const handleConvert = async (planId: string) => {
    if (!confirm('Convert this AI plan to a real itinerary?')) return;

    try {
      const res = await fetch(`/api/ai-trip-plans/${planId}/convert`, {
        method: 'POST',
      });

      if (res.ok) {
        alert('Plan converted to itinerary successfully!');
        onPlanUpdated();
      } else {
        const error = await res.json();
        alert(`Failed to convert: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Failed to convert plan:', error);
      alert('Failed to convert plan. Please try again.');
    }
  };

  const handleDelete = async (planId: string) => {
    if (!confirm('Are you sure you want to delete this AI trip plan?')) return;

    try {
      const res = await fetch(`/api/ai-trip-plans/${planId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        onPlanUpdated();
      } else {
        alert('Failed to delete plan');
      }
    } catch (error) {
      console.error('Failed to delete plan:', error);
      alert('Failed to delete plan. Please try again.');
    }
  };

  if (plans.length === 0) {
    return (
      <div className="text-center py-16 border border-dashed border-surface-container rounded-2xl text-secondary bg-surface-container-low/40">
        <span className="material-symbols-outlined text-4xl mb-2 block text-secondary/60">
          explore_off
        </span>
        <p className="font-semibold text-body-lg">No AI trip plans yet.</p>
        <p className="text-xs text-secondary/80 mt-1">
          Create your first AI-powered itinerary to get started.
        </p>
        <Link
          href="/dashboard/ai-planner?new=true"
          className="inline-block mt-4 px-6 py-2 bg-primary-container text-on-primary-container rounded-lg font-semibold text-sm hover:shadow-md transition-all cursor-pointer"
        >
          Create AI Plan
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4 xl:space-y-6">
        {plans.map((plan) => (
          <AITripPlanCard
            key={plan._id}
            plan={plan}
            onPreview={() => handlePreview(plan._id)}
            onExport={() => handleExport(plan._id)}
            onContinue={() => handleContinue(plan._id)}
            onConvert={() => handleConvert(plan._id)}
            onDelete={() => handleDelete(plan._id)}
          />
        ))}
      </div>

      {previewPlanId && (
        <QuickPreviewModal
          planId={previewPlanId}
          onClose={() => setPreviewPlanId(null)}
        />
      )}
    </>
  );
}
