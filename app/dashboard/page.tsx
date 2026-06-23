'use client';

import { useSession, signOut } from 'next-auth/react';
import { useState, useEffect } from 'react';
import TripList from '@/components/TripList';
import TripForm from '@/components/TripForm';

export default function Dashboard() {
  const { data: session, status } = useSession();
  const [trips, setTrips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTrips = async () => {
    try {
      const res = await fetch('/api/trips');
      if (res.ok) {
        const data = await res.json();
        setTrips(data);
      }
    } catch (error) {
      console.error('Failed to fetch trips', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === 'authenticated') {
      fetchTrips();
    }
  }, [status]);

  if (status === 'loading' || loading) {
    return <div className="flex h-screen items-center justify-center text-sm uppercase tracking-widest text-gray-500">Loading...</div>;
  }

  if (status === 'unauthenticated') {
    return null; // Handled by middleware
  }

  return (
    <div className="min-h-screen bg-white pb-12 font-sans">
      <nav className="border-b border-black">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 justify-between">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold tracking-tight text-black">Vyora</h1>
            </div>
            <div className="flex items-center space-x-6">
              <span className="text-sm font-medium text-gray-900">{session?.user?.name || session?.user?.email}</span>
              <button
                onClick={() => signOut({ callbackUrl: '/login' })}
                className="text-sm font-medium text-gray-500 hover:text-black underline underline-offset-4 transition-colors"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex flex-col lg:flex-row gap-12">
          <div className="w-full lg:w-1/3">
            <div className="sticky top-12">
              <h2 className="text-xl font-semibold mb-6 text-black border-b border-gray-200 pb-2">Plan a New Trip</h2>
              <TripForm onTripCreated={fetchTrips} />
            </div>
          </div>
          <div className="w-full lg:w-2/3">
            <h2 className="text-xl font-semibold mb-6 text-black border-b border-gray-200 pb-2">Your Itineraries</h2>
            <TripList trips={trips} onTripUpdated={fetchTrips} />
          </div>
        </div>
      </main>
    </div>
  );
}
