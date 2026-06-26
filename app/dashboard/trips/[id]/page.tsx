/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useSession } from 'next-auth/react';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

// Reuse the category icon helper
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

export default function TripDetailPage() {
  const { status } = useSession();
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [trip, setTrip] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'days' | 'stay' | 'transport'>('overview');

  useEffect(() => {
    if (status === 'authenticated' && id) {
      fetch(`/api/trips/${id}`)
        .then(res => {
          if (!res.ok) throw new Error('Failed to fetch');
          return res.json();
        })
        .then(data => {
          setTrip(data);
          setLoading(false);
        })
        .catch(err => {
          console.error(err);
          router.push('/dashboard');
        });
    } else if (status === 'unauthenticated') {
      router.push('/');
    }
  }, [status, id, router]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-surface text-sm uppercase tracking-widest text-secondary font-semibold font-sans">
        <span className="material-symbols-outlined text-primary text-3xl animate-spin mr-2">progress_activity</span>
        Loading...
      </div>
    );
  }

  if (!trip) return null;

  const plan = trip.itineraryData || {};
  const extendedPlan = plan as any;

  const tabs = [
    { id: 'overview' as const, label: 'Overview', icon: 'summarize' },
    { id: 'days' as const, label: 'Days', icon: 'calendar_today' },
    { id: 'stay' as const, label: 'Stay & Eat', icon: 'hotel' },
    { id: 'transport' as const, label: 'Transport', icon: 'directions_transit' },
  ];

  return (
    <div className="min-h-screen bg-surface pb-12 font-sans flex flex-col">
      <nav className="bg-white border-b border-surface-container sticky top-0 z-40">
        <div className="mx-auto max-w-[1400px] w-full px-6 py-4 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2 group text-secondary hover:text-primary transition-colors">
            <span className="material-symbols-outlined text-xl">arrow_back</span>
            <span className="font-semibold text-sm">Back to Dashboard</span>
          </Link>
          <div className="font-bold text-on-surface">{trip.destination}</div>
          <div className="w-8"></div>
        </div>
      </nav>

      <main className="mx-auto max-w-4xl w-full px-6 py-12 flex-1">
        <div className="bg-white rounded-2xl border border-surface-container shadow-xl overflow-hidden flex flex-col min-h-[600px]">
          <div className="flex-shrink-0 px-6 py-5 border-b border-surface-container bg-surface-container-lowest">
            <div className="flex items-center gap-2 mb-2">
              <span className="material-symbols-outlined text-primary text-2xl">luggage</span>
              <h1 className="text-2xl font-bold text-on-surface">{trip.destination} Itinerary</h1>
            </div>
            <div className="flex flex-wrap items-center gap-3 mt-3">
              {plan.duration && <span className="flex items-center gap-1 text-sm text-secondary font-mono bg-surface-container px-3 py-1 rounded-lg"><span className="material-symbols-outlined text-sm">schedule</span>{plan.duration} days</span>}
              {plan.budget && plan.budget.amount !== undefined && <span className="flex items-center gap-1 text-sm text-secondary font-mono bg-surface-container px-3 py-1 rounded-lg"><span className="material-symbols-outlined text-sm">payments</span>{plan.budget.currency} {Number(plan.budget.amount).toLocaleString()}</span>}
              {extendedPlan.travelStyle && <span className="px-3 py-1 rounded-lg bg-primary-container/20 text-primary text-xs font-bold uppercase tracking-wider">{extendedPlan.travelStyle}</span>}
              <span className={`px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider ml-auto ${trip.status === 'planning' ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-800'}`}>
                {trip.status}
              </span>
            </div>
          </div>

          <div className="flex flex-shrink-0 border-b border-surface-container bg-white overflow-x-auto">
            {tabs.map((tab) => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex flex-col items-center py-3 min-w-[100px] text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer ${activeTab === tab.id ? 'text-primary border-b-2 border-primary bg-primary-container/5' : 'text-secondary hover:text-on-surface hover:bg-surface-container-lowest'}`}>
                <span className="material-symbols-outlined text-lg mb-1">{tab.icon}</span>{tab.label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto bg-surface-container-lowest p-6">
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {plan.overview && (
                  <div className="p-5 rounded-2xl bg-white border border-surface-container shadow-sm">
                    <p className="text-sm font-bold text-on-surface/60 uppercase tracking-wider mb-2">Overview</p>
                    <p className="text-base text-on-surface leading-relaxed">{plan.overview}</p>
                  </div>
                )}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {plan.duration && <div className="p-4 rounded-2xl bg-white border border-surface-container text-center shadow-sm"><span className="material-symbols-outlined text-primary text-2xl block mb-2">calendar_today</span><p className="text-2xl font-bold text-on-surface">{plan.duration}</p><p className="text-sm text-secondary mt-1">Days</p></div>}
                  {plan.budget && plan.budget.amount !== undefined && <div className="p-4 rounded-2xl bg-white border border-surface-container text-center shadow-sm"><span className="material-symbols-outlined text-primary text-2xl block mb-2">payments</span><p className="text-2xl font-bold text-on-surface font-mono">{Number(plan.budget.amount).toLocaleString()}</p><p className="text-sm text-secondary mt-1">{plan.budget.currency}</p></div>}
                  {plan.hotels && <div className="p-4 rounded-2xl bg-white border border-surface-container text-center shadow-sm"><span className="material-symbols-outlined text-primary text-2xl block mb-2">hotel</span><p className="text-2xl font-bold text-on-surface">{plan.hotels.length}</p><p className="text-sm text-secondary mt-1">Hotels</p></div>}
                  {plan.restaurants && <div className="p-4 rounded-2xl bg-white border border-surface-container text-center shadow-sm"><span className="material-symbols-outlined text-primary text-2xl block mb-2">restaurant</span><p className="text-2xl font-bold text-on-surface">{plan.restaurants.length}</p><p className="text-sm text-secondary mt-1">Restaurants</p></div>}
                </div>
                {plan.totalEstimatedCost && (
                  <div className="p-5 rounded-2xl bg-primary-container border border-primary-container/30 shadow-sm">
                    <p className="text-sm text-on-primary-container/80 font-semibold uppercase tracking-wider mb-1">Total Estimated Cost</p>
                    <p className="text-2xl font-bold text-on-primary-container">{plan.totalEstimatedCost}</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'days' && (
              <div className="space-y-6">
                {!plan.days || plan.days.length === 0 ? (
                  <div className="text-center py-12"><span className="material-symbols-outlined text-5xl text-secondary/20 block mb-4">calendar_today</span><p className="text-lg text-secondary/60 font-medium">No day plans available</p></div>
                ) : plan.days.map((day: any) => (
                  <div key={day.day} className="bg-white border border-surface-container shadow-sm rounded-2xl overflow-hidden">
                    <div className="flex items-center gap-3 px-5 py-4 bg-surface-container-lowest border-b border-surface-container">
                      <div className="w-10 h-10 rounded-xl bg-primary-container flex items-center justify-center flex-shrink-0 shadow-inner">
                        <span className="text-on-primary-container text-sm font-bold text-center leading-tight">Day<br/>{day.day}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-lg font-bold text-on-surface truncate">{day.title || `Day ${day.day}`}</p>
                        {day.estimatedCost && <p className="text-sm text-secondary font-mono mt-0.5">{day.estimatedCost}</p>}
                      </div>
                    </div>
                    <div className="p-5 space-y-4">
                      {day.activities.map((activity: any, aIdx: number) => (
                        <div key={aIdx} className="flex items-start gap-4">
                          <div className="w-10 h-10 rounded-full bg-surface-container-low flex items-center justify-center flex-shrink-0 mt-0.5 border border-surface-container">
                            <span className="material-symbols-outlined text-primary/70">{getCategoryIcon(activity.category)}</span>
                          </div>
                          <div className="flex-1 min-w-0 pt-0.5">
                            <p className="text-base font-bold text-on-surface">{activity.name}</p>
                            <div className="flex flex-wrap gap-2 mt-1.5">
                              {activity.time && <span className="text-sm text-secondary font-mono bg-surface-container-lowest px-2 py-0.5 rounded border border-surface-container">{activity.time}</span>}
                              {activity.duration && <span className="text-sm text-secondary bg-surface-container-lowest px-2 py-0.5 rounded border border-surface-container">{activity.duration}</span>}
                              {activity.cost && <span className="text-sm text-primary font-mono font-bold bg-primary-container/20 px-2 py-0.5 rounded border border-primary-container/30">{activity.cost}</span>}
                            </div>
                            {activity.location && <p className="text-sm text-secondary flex items-start gap-1 mt-2"><span className="material-symbols-outlined text-[16px] mt-0.5">location_on</span><span className="flex-1">{activity.location}</span></p>}
                          </div>
                        </div>
                      ))}
                      {day.notes && <div className="border-t border-surface-container pt-4 mt-4"><p className="text-sm text-secondary italic bg-surface-container-lowest p-3 rounded-lg border border-surface-container/50">{day.notes}</p></div>}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'stay' && (
              <div className="space-y-8">
                {plan.hotels && plan.hotels.length > 0 && (
                  <div>
                    <h3 className="text-lg font-bold text-on-surface flex items-center gap-2 mb-4"><span className="material-symbols-outlined text-primary">hotel</span>Hotels</h3>
                    <div className="grid gap-4">
                      {plan.hotels.map((hotel: any, idx: number) => (
                        <div key={idx} className="bg-white border border-surface-container shadow-sm rounded-2xl p-5">
                          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-3">
                            <div>
                              <p className="text-lg font-bold text-on-surface">{hotel.name}</p>
                              {hotel.type && <p className="text-sm text-secondary">{hotel.type}</p>}
                            </div>
                            {hotel.pricePerNight && <span className="text-sm font-bold text-primary font-mono bg-primary-container/10 px-3 py-1.5 rounded-lg border border-primary-container/20 shrink-0">{hotel.pricePerNight}/night</span>}
                          </div>
                          {hotel.location && <p className="text-sm text-secondary flex items-start gap-1 mb-3"><span className="material-symbols-outlined text-[16px] mt-0.5">location_on</span><span className="flex-1">{hotel.location}</span></p>}
                          {hotel.amenities && hotel.amenities.length > 0 && <div className="flex flex-wrap gap-2 mb-3">{hotel.amenities.map((a: string, ai: number) => <span key={ai} className="px-2.5 py-1 rounded-lg bg-surface-container text-xs font-medium text-secondary">{a}</span>)}</div>}
                          {hotel.notes && <p className="text-sm text-secondary/80 italic border-l-2 border-primary/30 pl-3 py-1 bg-surface-container-lowest">{hotel.notes}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {plan.restaurants && plan.restaurants.length > 0 && (
                  <div>
                    <h3 className="text-lg font-bold text-on-surface flex items-center gap-2 mb-4"><span className="material-symbols-outlined text-primary">restaurant</span>Restaurants</h3>
                    <div className="grid md:grid-cols-2 gap-4">
                      {plan.restaurants.map((rest: any, idx: number) => (
                        <div key={idx} className="bg-white border border-surface-container shadow-sm rounded-2xl p-5 flex flex-col">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div><p className="text-base font-bold text-on-surface">{rest.name}</p>{rest.cuisine && <p className="text-sm text-secondary">{rest.cuisine}</p>}</div>
                            {rest.priceRange && <span className="text-sm font-bold text-primary bg-primary-container/10 px-2 py-0.5 rounded border border-primary-container/20 shrink-0">{rest.priceRange}</span>}
                          </div>
                          {rest.location && <p className="text-sm text-secondary flex items-start gap-1 mb-3"><span className="material-symbols-outlined text-[16px] mt-0.5">location_on</span><span className="flex-1">{rest.location}</span></p>}
                          <div className="mt-auto space-y-2 pt-2">
                            {rest.speciality && <p className="text-sm text-on-surface bg-surface-container-lowest p-2 rounded-lg border border-surface-container"><span className="font-semibold text-primary mr-1">Must Try:</span>{rest.speciality}</p>}
                            {rest.notes && <p className="text-xs text-secondary italic">{rest.notes}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {(!plan.hotels || plan.hotels.length === 0) && (!plan.restaurants || plan.restaurants.length === 0) && (
                  <div className="text-center py-12"><span className="material-symbols-outlined text-5xl text-secondary/20 block mb-4">hotel</span><p className="text-lg text-secondary/60 font-medium">No accommodation or dining information available</p></div>
                )}
              </div>
            )}

            {activeTab === 'transport' && (
              <div className="space-y-4">
                {!plan.transport || plan.transport.length === 0 ? (
                  <div className="text-center py-12"><span className="material-symbols-outlined text-5xl text-secondary/20 block mb-4">directions_transit</span><p className="text-lg text-secondary/60 font-medium">No transport arrangements specified</p></div>
                ) : plan.transport.map((t: any, idx: number) => (
                  <div key={idx} className="bg-white border border-surface-container shadow-sm rounded-2xl p-5">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 rounded-xl bg-primary-container/20 flex items-center justify-center text-primary border border-primary-container/30">
                        <span className="material-symbols-outlined text-2xl">
                          {t.type.toLowerCase().includes('flight') ? 'flight' : t.type.toLowerCase().includes('train') ? 'train' : t.type.toLowerCase().includes('bus') ? 'directions_bus' : t.type.toLowerCase().includes('taxi') ? 'local_taxi' : t.type.toLowerCase().includes('metro') ? 'subway' : 'directions_transit'}
                        </span>
                      </div>
                      <div>
                        <span className="text-lg font-bold text-on-surface block leading-tight">{t.type}</span>
                        {t.cost && <span className="text-sm font-bold text-primary font-mono">{t.cost}</span>}
                      </div>
                    </div>
                    
                    {(t.from || t.to) && (
                      <div className="flex items-center gap-3 bg-surface-container-lowest p-3 rounded-xl border border-surface-container mb-3">
                        {t.from && <div className="flex-1"><p className="text-xs text-secondary uppercase font-bold tracking-wider mb-0.5">From</p><p className="text-sm font-medium text-on-surface">{t.from}</p></div>}
                        {t.from && t.to && <span className="material-symbols-outlined text-secondary">arrow_forward</span>}
                        {t.to && <div className="flex-1 text-right"><p className="text-xs text-secondary uppercase font-bold tracking-wider mb-0.5">To</p><p className="text-sm font-medium text-on-surface">{t.to}</p></div>}
                      </div>
                    )}
                    
                    <div className="flex flex-wrap gap-4 mt-2">
                      {t.duration && <div className="flex items-center gap-1.5"><span className="material-symbols-outlined text-[16px] text-secondary">schedule</span><span className="text-sm text-on-surface">{t.duration}</span></div>}
                      {t.bookingInfo && <div className="flex items-center gap-1.5"><span className="material-symbols-outlined text-[16px] text-secondary">confirmation_number</span><span className="text-sm text-on-surface">{t.bookingInfo}</span></div>}
                    </div>
                    {t.notes && <p className="text-sm text-secondary italic mt-4 pt-3 border-t border-surface-container">{t.notes}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
