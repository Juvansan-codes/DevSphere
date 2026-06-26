/* eslint-disable @typescript-eslint/no-explicit-any */
export interface Trip {
  _id: string;
  destination: string;
  description?: string;
  status: 'planning' | 'booked' | 'completed';
  createdAt: string;
  updatedAt: string;
  itineraryData?: any;
}
