import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const TrackTicket = () => {
  const navigate = useNavigate();
  const [trackId, setTrackId] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (event) => {
    event.preventDefault();
    setError('');

    if (!trackId.trim() || !mobileNumber.trim()) {
      setError('Enter both Track ID and mobile number to track your ticket.');
      return;
    }

    navigate(`/tracking/${encodeURIComponent(trackId.trim())}`);
  };

  return (
    <div className="min-h-screen bg-slate-100 p-8">
      <div className="mx-auto max-w-2xl rounded-[2rem] bg-white p-8 shadow-xl">
        <h1 className="text-3xl font-extrabold text-slate-900 mb-4">Track Ticket</h1>
        <p className="text-slate-600 mb-6">Enter your Track ID and mobile number to view the live bus status.</p>

        {error ? <div className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</div> : null}

        <form onSubmit={handleSubmit} className="space-y-5">
          <label className="block">
            <span className="text-sm font-semibold text-slate-700">Track ID</span>
            <input
              type="text"
              value={trackId}
              onChange={(event) => setTrackId(event.target.value)}
              placeholder="Example: TRK-12345678"
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-base outline-none transition focus:border-[#df6b57] focus:bg-white"
            />
          </label>

          <label className="block">
            <span className="text-sm font-semibold text-slate-700">Mobile Number</span>
            <input
              type="tel"
              value={mobileNumber}
              onChange={(event) => setMobileNumber(event.target.value)}
              placeholder="Enter mobile number"
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-base outline-none transition focus:border-[#df6b57] focus:bg-white"
            />
          </label>

          <button
            type="submit"
            className="w-full rounded-2xl bg-[#df6b57] px-6 py-3 text-base font-bold text-white transition hover:bg-[#c75845]"
          >
            Track Ticket
          </button>
        </form>
      </div>
    </div>
  );
};

export default TrackTicket;
