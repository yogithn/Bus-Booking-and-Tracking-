import React, { useEffect, useState } from 'react';
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const History = () => {
  const [bookings, setBookings] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBookings = async () => {
      const token = localStorage.getItem('token');

      if (!token) {
        setError('Please sign in first to view booking history.');
        setLoading(false);
        return;
      }

      try {
        const response = await axios.get(`${API_BASE_URL}/bookings`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setBookings(response.data);
      } catch (fetchError) {
        if (fetchError?.response?.status === 401) {
          setError('Your session expired. Please sign in again.');
        } else {
          setError('Unable to load booking history right now.');
        }
      } finally {
        setLoading(false);
      }
    };
    fetchBookings();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <h1 className="text-2xl font-bold mb-6">Booking History</h1>
      {loading ? <p className="mb-4">Loading booking history...</p> : null}
      {error ? <p className="mb-4 text-red-600">{error}</p> : null}
      {!loading && !error && bookings.length === 0 ? (
        <div className="mb-4 rounded-xl bg-white p-4 text-gray-700 shadow">No bookings found yet.</div>
      ) : null}
      <div className="space-y-4">
        {bookings.map(booking => (
          <div key={booking._id} className="bg-white p-4 rounded-xl shadow">
            <p>Bus: {booking.bus.route}</p>
            <p>Seats: {booking.seats.join(', ')}</p>
            <p>Status: {booking.status}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default History;
