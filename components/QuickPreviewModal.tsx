import { AITripPlan, DayPlan, Hotel, Restaurant, Transport } from '@/types/ai-trip-plan';
import { useState, useEffect } from 'react';

interface QuickPreviewModalProps {
  planId: string;
  onClose: () => void;
}

export default function QuickPreviewModal({ planId, onClose }: QuickPreviewModalProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'days' | 'stay' | 'transport'>('overview');
  const [plan, setPlan] = useState<AITripPlan | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchFullPlan() {
      try {
        const res = await fetch(`/api/ai-trip-plans/${encodeURIComponent(planId)}`);
        if (res.ok) {
          const data = await res.json();
          setPlan(data);
        }
      } catch (err) {
        console.error('Failed to load full plan details:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchFullPlan();
  }, [planId]);

  // Prevent background scrolling when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, []);

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
        <div className="bg-white rounded-2xl p-8 shadow-2xl flex flex-col items-center">
          <span className="material-symbols-outlined text-primary text-4xl animate-spin mb-4">progress_activity</span>
          <p className="text-body-md text-secondary font-semibold">Loading your trip preview...</p>
        </div>
      </div>
    );
  }

  const generatedPlan = plan?.generatedPlan;

  if (!generatedPlan) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
        <div className="bg-white rounded-2xl p-6 shadow-2xl max-w-sm w-full text-center">
          <p className="text-body-md text-secondary mb-4">No trip plan details generated yet.</p>
          <button onClick={onClose} className="px-4 py-2 bg-primary-container text-on-primary-container rounded-lg font-semibold text-sm hover:shadow-md transition-all cursor-pointer">Close</button>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'overview' as const, label: 'Overview', icon: 'summarize' },
    { id: 'days' as const, label: 'Days', icon: 'calendar_today' },
    { id: 'stay' as const, label: 'Stay & Eat', icon: 'hotel' },
    { id: 'transport' as const, label: 'Transport', icon: 'directions_transit' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 md:p-8 animate-in fade-in duration-200" onClick={onClose}>
      <div 
        className="bg-surface-container-lowest border border-surface-container rounded-2xl shadow-2xl w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex-shrink-0 px-6 py-5 border-b border-surface-container bg-white flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="material-symbols-outlined text-primary text-xl">auto_awesome</span>
              <h2 className="text-headline-sm font-bold text-on-surface leading-tight">{plan?.title}</h2>
            </div>
            {generatedPlan.destination && (
              <div className="flex flex-wrap items-center gap-3">
                <p className="text-body-md font-semibold text-secondary flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px]">location_on</span>
                  {generatedPlan.destination}
                </p>
                {generatedPlan.duration && (
                  <span className="flex items-center gap-1 text-label-sm text-secondary font-mono bg-surface-container px-2 py-0.5 rounded-full">
                    <span className="material-symbols-outlined text-xs">schedule</span>{generatedPlan.duration} days
                  </span>
                )}
                {generatedPlan.budget && generatedPlan.budget.amount !== undefined && (
                  <span className="flex items-center gap-1 text-label-sm text-secondary font-mono bg-surface-container px-2 py-0.5 rounded-full">
                    <span className="material-symbols-outlined text-xs">payments</span>
                    {Number(generatedPlan.budget.amount).toLocaleString()} {generatedPlan.budget.currency}
                  </span>
                )}
              </div>
            )}
          </div>
          <button onClick={onClose} className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-surface-container transition-colors text-secondary flex-shrink-0 cursor-pointer">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex-shrink-0 flex border-b border-surface-container bg-surface-container-lowest">
          {tabs.map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 py-3.5 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer border-b-2 ${activeTab === tab.id ? 'text-primary border-primary bg-primary-container/5' : 'text-secondary border-transparent hover:text-on-surface hover:bg-surface-container/50'}`}>
              <span className="material-symbols-outlined text-[18px]">{tab.icon}</span>
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto bg-surface-container-lowest p-6">
          <div className="max-w-3xl mx-auto">
            {activeTab === 'overview' && (
              <div className="space-y-6 animate-in slide-in-from-right-2 duration-300">
                {generatedPlan.overview && (
                  <div className="p-5 rounded-2xl bg-white border border-surface-container shadow-sm">
                    <p className="text-label-md font-bold text-on-surface/60 uppercase tracking-wider mb-2 flex items-center gap-1.5"><span className="material-symbols-outlined text-base">summarize</span>Overview</p>
                    <p className="text-body-lg text-on-surface leading-relaxed">{generatedPlan.overview}</p>
                  </div>
                )}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {generatedPlan.duration && (
                    <div className="p-4 rounded-2xl bg-white border border-surface-container shadow-sm flex flex-col items-center text-center">
                      <span className="material-symbols-outlined text-primary text-2xl mb-2">calendar_today</span>
                      <p className="text-headline-md font-bold text-on-surface">{generatedPlan.duration}</p>
                      <p className="text-label-sm text-secondary uppercase tracking-wider">Days</p>
                    </div>
                  )}
                  {generatedPlan.budget && generatedPlan.budget.amount !== undefined && (
                    <div className="p-4 rounded-2xl bg-white border border-surface-container shadow-sm flex flex-col items-center text-center">
                      <span className="material-symbols-outlined text-primary text-2xl mb-2">payments</span>
                      <p className="text-headline-md font-bold text-on-surface font-mono">{Number(generatedPlan.budget.amount).toLocaleString()}</p>
                      <p className="text-label-sm text-secondary uppercase tracking-wider">{generatedPlan.budget.currency}</p>
                    </div>
                  )}
                  {generatedPlan.hotels && (
                    <div className="p-4 rounded-2xl bg-white border border-surface-container shadow-sm flex flex-col items-center text-center">
                      <span className="material-symbols-outlined text-primary text-2xl mb-2">hotel</span>
                      <p className="text-headline-md font-bold text-on-surface">{generatedPlan.hotels.length}</p>
                      <p className="text-label-sm text-secondary uppercase tracking-wider">Hotels</p>
                    </div>
                  )}
                  {generatedPlan.restaurants && (
                    <div className="p-4 rounded-2xl bg-white border border-surface-container shadow-sm flex flex-col items-center text-center">
                      <span className="material-symbols-outlined text-primary text-2xl mb-2">restaurant</span>
                      <p className="text-headline-md font-bold text-on-surface">{generatedPlan.restaurants.length}</p>
                      <p className="text-label-sm text-secondary uppercase tracking-wider">Dining</p>
                    </div>
                  )}
                </div>
                {generatedPlan.totalEstimatedCost && (
                  <div className="p-5 rounded-2xl bg-primary-container/10 border border-primary-container/30 flex items-center justify-between gap-4">
                    <div>
                      <p className="text-label-md text-secondary/70 font-semibold uppercase tracking-wider mb-1">Total Estimated Cost</p>
                      <p className="text-headline-lg font-bold text-primary">
                        {generatedPlan.totalEstimatedCost.replace(/\b\d+(?:\.\d+)?\b/g, (match) => Number(match).toLocaleString())}
                      </p>
                    </div>
                    <span className="material-symbols-outlined text-4xl text-primary/20">receipt_long</span>
                  </div>
                )}
                {generatedPlan.notes && (
                  <div className="p-5 rounded-2xl bg-surface-container-low border border-surface-container">
                    <p className="text-label-md font-bold text-on-surface/60 uppercase tracking-wider mb-2 flex items-center gap-1.5"><span className="material-symbols-outlined text-base">sticky_note_2</span>Important Notes</p>
                    <p className="text-body-md text-secondary leading-relaxed">{generatedPlan.notes}</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'days' && (
              <div className="space-y-6 animate-in slide-in-from-right-2 duration-300">
                {!generatedPlan.days || generatedPlan.days.length === 0 ? (
                  <div className="text-center py-16"><span className="material-symbols-outlined text-6xl text-secondary/20 block mb-4">calendar_today</span><p className="text-body-lg text-secondary/50">No daily itinerary generated yet</p></div>
                ) : generatedPlan.days.map((day: DayPlan) => (
                  <div key={day.day} className="bg-white border border-surface-container rounded-2xl overflow-hidden shadow-sm">
                    <div className="flex items-center gap-4 px-6 py-4 bg-surface-container-lowest border-b border-surface-container">
                      <div className="w-12 h-12 rounded-xl bg-primary-container text-on-primary-container flex items-center justify-center flex-shrink-0 shadow-inner">
                        <span className="text-xl font-bold">{day.day}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-headline-sm font-semibold text-on-surface truncate">{day.title || `Day ${day.day}`}</p>
                        {day.estimatedCost && <p className="text-body-sm text-secondary font-mono mt-0.5">Est. Cost: {day.estimatedCost}</p>}
                      </div>
                    </div>
                    <div className="p-6">
                      <div className="relative">
                        <div className="absolute left-4 top-4 bottom-4 w-px bg-surface-container-high hidden sm:block"></div>
                        <div className="space-y-6">
                          {(day.activities ?? []).map((activity, aIdx) => (
                            <div key={aIdx} className="flex gap-4 sm:gap-6 relative">
                              <div className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center flex-shrink-0 z-10 hidden sm:flex border-4 border-white">
                                <span className="material-symbols-outlined text-[16px] text-secondary">place</span>
                              </div>
                              <div className="flex-1 bg-surface-container-lowest border border-surface-container rounded-xl p-4">
                                <div className="flex items-start justify-between gap-4 mb-2">
                                  <p className="text-body-lg font-bold text-on-surface">{activity.name}</p>
                                  {activity.cost && <span className="text-label-md text-primary font-mono font-bold bg-primary-container/20 px-2 py-1 rounded-md">{activity.cost}</span>}
                                </div>
                                <p className="text-body-md text-secondary leading-relaxed mb-3">{activity.description}</p>
                                <div className="flex flex-wrap gap-3 mt-2 pt-3 border-t border-surface-container-low">
                                  {activity.time && <span className="flex items-center gap-1.5 text-label-sm text-secondary font-mono"><span className="material-symbols-outlined text-[14px]">schedule</span>{activity.time}</span>}
                                  {activity.duration && <span className="flex items-center gap-1.5 text-label-sm text-secondary"><span className="material-symbols-outlined text-[14px]">hourglass_empty</span>{activity.duration}</span>}
                                  {activity.location && <span className="flex items-center gap-1.5 text-label-sm text-secondary"><span className="material-symbols-outlined text-[14px]">location_on</span>{activity.location}</span>}
                                </div>
                              </div>
                            </div>
                          ))}
                          {(!day.activities || day.activities.length === 0) && (
                            <p className="text-body-md text-secondary/50 italic pl-12">No activities planned for this day.</p>
                          )}
                        </div>
                      </div>
                      {day.notes && (
                        <div className="mt-6 p-4 bg-yellow-50 rounded-xl border border-yellow-100">
                          <p className="text-body-sm text-yellow-800 flex items-center gap-2"><span className="material-symbols-outlined text-base">lightbulb</span>{day.notes}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'stay' && (
              <div className="space-y-8 animate-in slide-in-from-right-2 duration-300">
                {/* Hotels Section */}
                <section>
                  <div className="flex items-center gap-2 mb-4 px-2">
                    <span className="material-symbols-outlined text-primary text-2xl">hotel</span>
                    <h3 className="text-headline-sm font-bold text-on-surface">Accommodation</h3>
                  </div>
                  {!generatedPlan.hotels || generatedPlan.hotels.length === 0 ? (
                    <div className="p-8 border border-dashed border-surface-container rounded-2xl text-center"><p className="text-secondary/50">No hotels added yet.</p></div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {generatedPlan.hotels.map((hotel: Hotel, idx: number) => (
                        <div key={idx} className="bg-white border border-surface-container rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
                          <div className="flex justify-between items-start mb-2">
                            <h4 className="text-body-lg font-bold text-on-surface leading-tight pr-4">{hotel.name}</h4>
                            {hotel.pricePerNight && <span className="text-label-md font-mono font-bold text-primary bg-primary-container/10 px-2 py-1 rounded-md whitespace-nowrap">{hotel.pricePerNight}</span>}
                          </div>
                          {hotel.type && <p className="text-label-sm text-secondary uppercase tracking-wider mb-3">{hotel.type}</p>}
                          {hotel.location && <p className="text-body-sm text-secondary flex items-start gap-1.5 mb-4"><span className="material-symbols-outlined text-[16px] mt-0.5">location_on</span><span className="leading-snug">{hotel.location}</span></p>}
                          {hotel.amenities && hotel.amenities.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mb-4">
                              {hotel.amenities.slice(0, 4).map((a, ai) => (
                                <span key={ai} className="px-2 py-1 rounded-md bg-surface-container-low text-[10px] font-semibold text-secondary uppercase tracking-wider">{a}</span>
                              ))}
                              {hotel.amenities.length > 4 && <span className="px-2 py-1 rounded-md bg-surface-container-low text-[10px] font-semibold text-secondary uppercase tracking-wider">+{hotel.amenities.length - 4} more</span>}
                            </div>
                          )}
                          {hotel.notes && <p className="text-body-sm text-secondary/70 italic border-t border-surface-container-low pt-3">{hotel.notes}</p>}
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                {/* Restaurants Section */}
                <section>
                  <div className="flex items-center gap-2 mb-4 px-2 mt-8 border-t border-surface-container pt-8">
                    <span className="material-symbols-outlined text-primary text-2xl">restaurant</span>
                    <h3 className="text-headline-sm font-bold text-on-surface">Dining Recommendations</h3>
                  </div>
                  {!generatedPlan.restaurants || generatedPlan.restaurants.length === 0 ? (
                    <div className="p-8 border border-dashed border-surface-container rounded-2xl text-center"><p className="text-secondary/50">No restaurants added yet.</p></div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {generatedPlan.restaurants.map((rest: Restaurant, idx: number) => (
                        <div key={idx} className="bg-white border border-surface-container rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
                          <div className="flex justify-between items-start mb-2">
                            <h4 className="text-body-lg font-bold text-on-surface leading-tight pr-4">{rest.name}</h4>
                            {rest.priceRange && <span className="text-label-md font-bold text-green-600 bg-green-50 px-2 py-1 rounded-md whitespace-nowrap">{rest.priceRange}</span>}
                          </div>
                          {rest.cuisine && <p className="text-label-sm text-secondary uppercase tracking-wider mb-3">{rest.cuisine}</p>}
                          {rest.location && <p className="text-body-sm text-secondary flex items-start gap-1.5 mb-3"><span className="material-symbols-outlined text-[16px] mt-0.5">location_on</span><span className="leading-snug">{rest.location}</span></p>}
                          {rest.speciality && (
                            <div className="mb-3 p-3 bg-surface-container-lowest rounded-xl border border-surface-container">
                              <p className="text-body-sm text-on-surface"><span className="font-bold mr-1">Must try:</span>{rest.speciality}</p>
                            </div>
                          )}
                          {rest.notes && <p className="text-body-sm text-secondary/70 italic border-t border-surface-container-low pt-3">{rest.notes}</p>}
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </div>
            )}

            {activeTab === 'transport' && (
              <div className="space-y-4 animate-in slide-in-from-right-2 duration-300">
                {!generatedPlan.transport || generatedPlan.transport.length === 0 ? (
                  <div className="text-center py-16"><span className="material-symbols-outlined text-6xl text-secondary/20 block mb-4">directions_transit</span><p className="text-body-lg text-secondary/50">No transport options added yet</p></div>
                ) : generatedPlan.transport.map((t: Transport, idx: number) => (
                  <div key={idx} className="bg-white border border-surface-container rounded-2xl p-5 shadow-sm flex flex-col md:flex-row gap-6 items-start">
                    <div className="w-12 h-12 rounded-xl bg-surface-container-low flex items-center justify-center flex-shrink-0">
                      <span className="material-symbols-outlined text-2xl text-secondary">
                        {t.type.toLowerCase().includes('flight') ? 'flight' : t.type.toLowerCase().includes('train') ? 'train' : t.type.toLowerCase().includes('bus') ? 'directions_bus' : t.type.toLowerCase().includes('taxi') ? 'local_taxi' : t.type.toLowerCase().includes('metro') ? 'subway' : 'directions_transit'}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center justify-between gap-4 mb-3">
                        <span className="text-body-lg font-bold text-on-surface uppercase tracking-wide">{t.type}</span>
                        {t.cost && <span className="text-label-md font-mono font-bold text-primary bg-primary-container/10 px-3 py-1.5 rounded-lg">{t.cost}</span>}
                      </div>
                      
                      {(t.from || t.to) && (
                        <div className="flex items-center gap-3 text-body-lg text-on-surface mb-4 bg-surface-container-lowest p-3 rounded-xl border border-surface-container-low">
                          {t.from && <span className="font-semibold">{t.from}</span>}
                          {t.from && t.to && <span className="material-symbols-outlined text-secondary">arrow_forward</span>}
                          {t.to && <span className="font-semibold">{t.to}</span>}
                        </div>
                      )}
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                        {t.duration && <p className="text-body-sm text-secondary flex items-center gap-2"><span className="material-symbols-outlined text-[16px]">hourglass_empty</span><span className="font-mono">{t.duration}</span></p>}
                        {t.bookingInfo && <p className="text-body-sm text-secondary flex items-center gap-2"><span className="material-symbols-outlined text-[16px]">confirmation_number</span><span>{t.bookingInfo}</span></p>}
                      </div>
                      
                      {t.notes && <p className="text-body-sm text-secondary/80 italic border-t border-surface-container-low pt-3">{t.notes}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
