'use client';

import { AITripPlan } from '@/types/ai-trip-plan';

interface AITripPlanCardProps {
  plan: AITripPlan;
  onPreview: () => void;
  onContinue: () => void;
  onConvert: () => void;
  onDelete: () => void;
  onExport: () => void;
}

export default function AITripPlanCard({
  plan,
  onPreview,
  onContinue,
  onConvert,
  onDelete,
  onExport,
}: AITripPlanCardProps) {
  // Status badge styling
  const getStatusBadge = (status: string) => {
    const styles = {
      draft: {
        bg: 'bg-primary-container/10',
        text: 'text-primary',
        dot: 'bg-primary-container',
      },
      finalized: {
        bg: 'bg-surface-container-highest',
        text: 'text-on-surface-variant',
        dot: 'bg-secondary',
      },
      archived: {
        bg: 'bg-surface-container',
        text: 'text-secondary',
        dot: 'bg-secondary',
      },
    };

    const style = styles[status as keyof typeof styles] || styles.draft;

    return (
      <span
        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${style.bg} ${style.text}`}
      >
        <span className={`w-2 h-2 rounded-full ${style.dot}`}></span>
        {status}
      </span>
    );
  };

  return (
    <div className="border border-surface-container rounded-xl p-6 xl:p-8 bg-white hover:border-surface-container-highest transition-all duration-300 shadow-sm relative group">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="material-symbols-outlined text-primary text-xl">
                explore
              </span>
              <h3 className="text-lg xl:text-xl font-bold text-on-surface leading-snug truncate">
                {plan.title}
              </h3>
            </div>
            <p className="text-body-md text-secondary flex items-center gap-1">
              <span className="material-symbols-outlined text-sm">location_on</span>
              {plan.destination}
            </p>
          </div>
          {getStatusBadge(plan.status)}
        </div>

        {/* Trip Details */}
        <div className="flex flex-wrap items-center gap-4 text-xs text-secondary">
          {plan.generatedPlan?.duration && (
            <div className="flex items-center gap-1">
              <span className="material-symbols-outlined text-sm">calendar_today</span>
              <span>{plan.generatedPlan.duration} days</span>
            </div>
          )}
          {plan.generatedPlan?.budget && plan.generatedPlan.budget.amount !== undefined && (
            <div className="flex items-center gap-1">
              <span className="material-symbols-outlined text-sm">payments</span>
              <span>
                {Number(plan.generatedPlan.budget.amount).toLocaleString()}{' '}
                {plan.generatedPlan.budget.currency}
              </span>
            </div>
          )}
          {plan.generatedPlan?.dayCount !== undefined && plan.generatedPlan.dayCount > 0 && (
            <div className="flex items-center gap-1">
              <span className="material-symbols-outlined text-sm">event_note</span>
              <span>{plan.generatedPlan.dayCount} days planned</span>
            </div>
          )}
          {plan.generatedPlan?.travelStyle && (
            <div className="flex items-center gap-1">
              <span className="material-symbols-outlined text-sm">style</span>
              <span>{plan.generatedPlan.travelStyle}</span>
            </div>
          )}
        </div>

        {/* Description/Overview */}
        {plan.generatedPlan?.overview && (
          <p className="text-body-md text-secondary leading-relaxed line-clamp-2">
            {plan.generatedPlan.overview}
          </p>
        )}

        {/* Footer: Created Date + Actions */}
        <div className="flex items-center justify-between gap-4 pt-2 border-t border-surface-container">
          <span className="text-xs text-secondary font-mono tracking-tight flex items-center gap-1">
            <span className="material-symbols-outlined text-xs">schedule</span>
            {new Date(plan.createdAt).toLocaleDateString(undefined, {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            })}
          </span>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={onPreview}
              className="px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary-container/10 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
              title="Quick Preview"
            >
              <span className="material-symbols-outlined text-[14px]">visibility</span>
              Preview
            </button>

            <button
              onClick={onExport}
              className="px-3 py-1.5 text-xs font-semibold text-secondary hover:bg-surface-container rounded-lg transition-colors cursor-pointer flex items-center gap-1"
              title="Export as PDF"
            >
              <span className="material-symbols-outlined text-[14px]">picture_as_pdf</span>
              Export
            </button>

            {plan.status === 'draft' && (
              <button
                onClick={onContinue}
                className="px-3 py-1.5 text-xs font-semibold bg-primary-container text-on-primary-container rounded-lg hover:shadow-md transition-all active:scale-95 cursor-pointer"
                title="Continue planning"
              >
                Continue
              </button>
            )}

            {plan.status === 'finalized' && (
              <button
                onClick={onConvert}
                className="px-3 py-1.5 text-xs font-semibold bg-primary-container text-on-primary-container rounded-lg hover:shadow-md transition-all active:scale-95 cursor-pointer"
                title="Convert to trip"
              >
                Convert
              </button>
            )}

            <button
              onClick={onDelete}
              className="w-8 h-8 rounded-full flex items-center justify-center border border-surface-container text-secondary hover:border-error hover:text-error transition-all cursor-pointer shadow-sm hover:shadow"
              title="Delete plan"
            >
              <span className="material-symbols-outlined text-base">delete</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
