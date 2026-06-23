'use client';

import { useState } from 'react';

export default function TripForm({ onTripCreated, initialData, onCancel }: any) {
  const [destination, setDestination] = useState(initialData?.destination || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [status, setStatus] = useState(initialData?.status || 'planning');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const isEdit = !!initialData;
    const url = isEdit ? `/api/trips/${initialData._id}` : '/api/trips';
    const method = isEdit ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ destination, description, status }),
      });

      if (res.ok) {
        if (!isEdit) {
          setDestination('');
          setDescription('');
          setStatus('planning');
        }
        onTripCreated();
      }
    } catch (error) {
      console.error('Error saving trip:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-black">Destination</label>
        <input
          type="text"
          required
          className="mt-1 block w-full border border-gray-300 px-3 py-2 text-black bg-white focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
          value={destination}
          onChange={(e) => setDestination(e.target.value)}
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-black">Description</label>
        <textarea
          rows={3}
          className="mt-1 block w-full border border-gray-300 px-3 py-2 text-black bg-white focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-black">Status</label>
        <select
          className="mt-1 block w-full border border-gray-300 px-3 py-2 text-black bg-white focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="planning">Planning</option>
          <option value="booked">Booked</option>
          <option value="completed">Completed</option>
        </select>
      </div>
      <div className="flex space-x-3 pt-2">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 justify-center bg-black py-2 px-4 text-sm font-medium text-white hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2 disabled:opacity-50"
        >
          {loading ? 'Saving...' : initialData ? 'Update Trip' : 'Create Trip'}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 justify-center border border-gray-300 bg-white py-2 px-4 text-sm font-medium text-black hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
