'use client';

import { useState } from 'react';
import TripForm from './TripForm';

export default function TripList({ trips, onTripUpdated }: any) {
  const [editingId, setEditingId] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this trip?')) return;
    
    try {
      const res = await fetch(`/api/trips/${id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        onTripUpdated();
      }
    } catch (error) {
      console.error('Failed to delete trip:', error);
    }
  };

  if (trips.length === 0) {
    return (
      <div className="text-center py-12 border border-dashed border-gray-300 text-gray-500">
        No trips planned yet.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {trips.map((trip: any) => (
        <div key={trip._id} className="border border-gray-200 p-5 hover:border-black transition-colors">
          {editingId === trip._id ? (
            <div className="bg-gray-50 p-4 -mx-5 -my-5 border-b border-black">
              <TripForm 
                initialData={trip} 
                onTripCreated={() => {
                  setEditingId(null);
                  onTripUpdated();
                }}
                onCancel={() => setEditingId(null)}
              />
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
              <div className="mb-4 sm:mb-0">
                <h3 className="text-xl font-semibold text-black">{trip.destination}</h3>
                {trip.description && (
                  <p className="mt-1 text-sm text-gray-600">{trip.description}</p>
                )}
                <div className="mt-3 flex items-center space-x-3">
                  <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium uppercase tracking-wider
                    ${trip.status === 'planning' ? 'bg-gray-100 text-gray-600' : ''}
                    ${trip.status === 'booked' ? 'bg-black text-white' : ''}
                    ${trip.status === 'completed' ? 'bg-white border border-gray-300 text-gray-800' : ''}
                  `}>
                    {trip.status}
                  </span>
                  <span className="text-xs text-gray-400">
                    {new Date(trip.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
              <div className="flex space-x-4">
                <button
                  onClick={() => setEditingId(trip._id)}
                  className="text-sm font-medium text-gray-500 hover:text-black transition-colors underline underline-offset-4"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(trip._id)}
                  className="text-sm font-medium text-gray-500 hover:text-black transition-colors underline underline-offset-4"
                >
                  Delete
                </button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
