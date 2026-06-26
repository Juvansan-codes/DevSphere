'use client';

import { useEffect, useState, use } from 'react';
import { AITripPlan, DayPlan, Hotel, Restaurant, Transport } from '@/types/ai-trip-plan';

export default function PrintTripPlanPage({ params }: { params: Promise<{ id: string }> }) {
  const unwrappedParams = use(params);
  const [plan, setPlan] = useState<AITripPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadPlan() {
      try {
        const res = await fetch(`/api/ai-trip-plans/${encodeURIComponent(unwrappedParams.id)}`);
        if (!res.ok) throw new Error('Failed to load plan');
        const data = await res.json();
        setPlan(data);
      } catch (err) {
        console.error('Failed to load the trip plan for printing:', err);
        setError('Failed to load the trip plan for printing.');
      } finally {
        setLoading(false);
      }
    }
    loadPlan();
  }, [unwrappedParams.id]);

  useEffect(() => {
    if (plan && !loading) {
      // Small delay to ensure styles and fonts are applied before printing
      const timer = setTimeout(() => {
        window.print();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [plan, loading]);

  if (loading) {
    return <div className="p-10 text-center font-sans">Preparing your itinerary for export...</div>;
  }

  if (error || !plan || !plan.generatedPlan) {
    return <div className="p-10 text-center text-red-500 font-sans">{error || 'No itinerary found.'}</div>;
  }

  const g = plan.generatedPlan;

  return (
    <div className="bg-white min-h-screen text-black font-sans w-full max-w-4xl mx-auto p-8 print:p-0">
      {/* Print styles override */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; background: white; }
          @page { margin: 1cm; }
          .page-break { page-break-before: always; }
          .avoid-break { page-break-inside: avoid; }
        }
      `}} />

      {/* Header */}
      <header className="border-b-2 border-gray-200 pb-6 mb-8 text-center">
        <h1 className="text-4xl font-bold mb-2 text-gray-900">{plan.title}</h1>
        <p className="text-xl text-gray-600 mb-4">{g.destination}</p>
        
        <div className="flex flex-wrap justify-center gap-6 text-sm font-semibold text-gray-500">
          {g.duration && <span>{g.duration} Days</span>}
          {g.budget && g.budget.amount !== undefined && (
            <span>Budget: {Number(g.budget.amount).toLocaleString()} {g.budget.currency}</span>
          )}
          {g.totalEstimatedCost && (
            <span>Est. Cost: {g.totalEstimatedCost.replace(/\b\d+(?:\.\d+)?\b/g, (match) => Number(match).toLocaleString())}</span>
          )}
        </div>
      </header>

      {/* Overview */}
      {g.overview && (
        <section className="mb-10 avoid-break">
          <h2 className="text-2xl font-bold mb-3 text-gray-800 border-b border-gray-100 pb-2">Overview</h2>
          <p className="text-gray-700 leading-relaxed">{g.overview}</p>
        </section>
      )}

      {/* Daily Itinerary */}
      {g.days && g.days.length > 0 && (
        <section className="mb-10">
          <h2 className="text-2xl font-bold mb-6 text-gray-800 border-b border-gray-100 pb-2">Daily Itinerary</h2>
          <div className="space-y-8">
            {g.days.map((day: DayPlan) => (
              <div key={day.day} className="avoid-break bg-gray-50 p-6 rounded-xl border border-gray-200">
                <div className="flex justify-between items-end mb-4 border-b border-gray-200 pb-3">
                  <h3 className="text-xl font-bold text-gray-800">Day {day.day}: {day.title}</h3>
                  {day.estimatedCost && <span className="text-sm font-mono text-gray-600">Est. {day.estimatedCost}</span>}
                </div>
                
                <div className="space-y-5">
                  {(day.activities ?? []).map((activity, idx) => (
                    <div key={idx} className="flex gap-4">
                      <div className="w-16 flex-shrink-0 text-sm font-mono text-gray-500 pt-0.5">{activity.time || '-'}</div>
                      <div className="flex-1">
                        <div className="flex justify-between items-start">
                          <h4 className="font-bold text-gray-900">{activity.name}</h4>
                          {activity.cost && <span className="text-sm font-semibold text-gray-600">{activity.cost}</span>}
                        </div>
                        <p className="text-sm text-gray-700 mt-1 mb-1">{activity.description}</p>
                        <div className="flex gap-4 text-xs text-gray-500">
                          {activity.duration && <span>{activity.duration}</span>}
                          {activity.location && <span>{activity.location}</span>}
                        </div>
                      </div>
                    </div>
                  ))}
                  {(!day.activities || day.activities.length === 0) && (
                    <p className="text-sm text-gray-500 italic">No specific activities planned.</p>
                  )}
                </div>
                
                {day.notes && (
                  <div className="mt-4 pt-3 border-t border-gray-200 text-sm text-gray-600 italic">
                    Note: {day.notes}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Accommodations & Dining */}
      <div className="page-break"></div>
      
      {g.hotels && g.hotels.length > 0 && (
        <section className="mb-10 avoid-break">
          <h2 className="text-2xl font-bold mb-6 text-gray-800 border-b border-gray-100 pb-2">Accommodation</h2>
          <div className="grid grid-cols-2 gap-6">
            {g.hotels.map((hotel: Hotel, idx: number) => (
              <div key={idx} className="border border-gray-200 p-4 rounded-lg bg-gray-50">
                <div className="flex justify-between items-start mb-1">
                  <h3 className="font-bold text-gray-900">{hotel.name}</h3>
                  {hotel.pricePerNight && <span className="text-sm font-mono">{hotel.pricePerNight}</span>}
                </div>
                <p className="text-sm text-gray-600 mb-2">{hotel.type} • {hotel.location}</p>
                {hotel.amenities && <p className="text-xs text-gray-500 mb-2">{hotel.amenities.join(' • ')}</p>}
                {hotel.notes && <p className="text-xs text-gray-600 italic">{hotel.notes}</p>}
              </div>
            ))}
          </div>
        </section>
      )}

      {g.restaurants && g.restaurants.length > 0 && (
        <section className="mb-10 avoid-break">
          <h2 className="text-2xl font-bold mb-6 text-gray-800 border-b border-gray-100 pb-2">Dining Recommendations</h2>
          <div className="grid grid-cols-2 gap-6">
            {g.restaurants.map((rest: Restaurant, idx: number) => (
              <div key={idx} className="border border-gray-200 p-4 rounded-lg bg-gray-50">
                <div className="flex justify-between items-start mb-1">
                  <h3 className="font-bold text-gray-900">{rest.name}</h3>
                  {rest.priceRange && <span className="text-sm font-mono">{rest.priceRange}</span>}
                </div>
                <p className="text-sm text-gray-600 mb-2">{rest.cuisine} • {rest.location}</p>
                {rest.speciality && <p className="text-sm text-gray-800 mb-2"><span className="font-semibold">Try:</span> {rest.speciality}</p>}
                {rest.notes && <p className="text-xs text-gray-600 italic">{rest.notes}</p>}
              </div>
            ))}
          </div>
        </section>
      )}

      {g.transport && g.transport.length > 0 && (
        <section className="mb-10 avoid-break">
          <h2 className="text-2xl font-bold mb-6 text-gray-800 border-b border-gray-100 pb-2">Transportation</h2>
          <div className="space-y-4">
            {g.transport.map((t: Transport, idx: number) => (
              <div key={idx} className="flex gap-4 border border-gray-200 p-4 rounded-lg bg-gray-50">
                <div className="flex-1">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-gray-900 uppercase tracking-wide">{t.type}</h3>
                    {t.cost && <span className="text-sm font-mono">{t.cost}</span>}
                  </div>
                  {t.from && t.to && <p className="text-sm font-semibold mb-1">{t.from} → {t.to}</p>}
                  <p className="text-xs text-gray-600 mb-2">Duration: {t.duration} {t.bookingInfo && `• Book: ${t.bookingInfo}`}</p>
                  {t.notes && <p className="text-xs text-gray-600 italic">{t.notes}</p>}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {g.notes && (
        <section className="mb-10 avoid-break">
          <h2 className="text-2xl font-bold mb-3 text-gray-800 border-b border-gray-100 pb-2">Important Notes</h2>
          <p className="text-gray-700 leading-relaxed text-sm bg-gray-50 p-4 rounded-lg border border-gray-200">{g.notes}</p>
        </section>
      )}
      
      <footer className="text-center text-xs text-gray-400 mt-16 pt-6 border-t border-gray-200">
        Generated by Vyora AI Trip Planner on {new Date().toLocaleDateString()}
      </footer>
    </div>
  );
}
