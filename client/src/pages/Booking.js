import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { formatDuration, formatTime } from '../utils/dateTime';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const getStoredLocalBookings = () => {
  try {
    return JSON.parse(localStorage.getItem('localBookings')) || [];
  } catch (error) {
    return [];
  }
};

const saveLocalBooking = (booking) => {
  try {
    const existing = getStoredLocalBookings();
    const next = [booking, ...existing.filter((item) => item._id !== booking._id)];
    localStorage.setItem('localBookings', JSON.stringify(next));
  } catch (error) {
    console.warn('Unable to persist local booking:', error.message);
  }
};

const getServiceNumber = (bus) => {
  if (!bus) return 'SERVICE-0000';
  if (bus.serviceNumber) return bus.serviceNumber;

  const idSuffix = String(bus._id || '').slice(-6).toUpperCase().replace(/[^A-Z0-9]/g, '0');
  const routeCode = `${bus.source || 'BUS'}`.slice(0, 3).toUpperCase();
  return `SVC-${routeCode}-${idSuffix}`;
};

const getOccupiedSeats = (totalSeats, availableSeats, busId) => {
  const maxSeats = Math.max(totalSeats || 0, 0);
  const occupiedCount = Math.max(0, maxSeats - Math.min(availableSeats || 0, maxSeats));
  const start = Number(String(busId || '').replace(/[^0-9]/g, '').slice(-3)) || 0;
  const offset = start % Math.max(maxSeats, 1);
  const seatNumbers = Array.from({ length: maxSeats }, (_, index) => index + 1);
  const rotated = [...seatNumbers.slice(offset), ...seatNumbers.slice(0, offset)];
  return new Set(rotated.slice(0, occupiedCount));
};

const seatFilterOptions = [
  { key: 'all', label: 'All', description: 'Show all seats' },
  { key: 'occupied', label: 'Occupied', description: 'Seats that are already taken' },
  { key: 'available', label: 'Available', description: 'Vacant seats you can choose' },
  { key: 'selected', label: 'Selected', description: 'Seats you have chosen' },
  { key: 'window', label: 'Window', description: 'Window-side seats' },
  { key: 'aisle', label: 'Aisle', description: 'Aisle-side seats' }
];

const Booking = () => {
  const { id } = useParams();
  const location = useLocation();
  const busFromState = location.state?.bus || null;
  const [bus, setBus] = useState(null);
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [seatFilter, setSeatFilter] = useState('all');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchBus = async () => {
      if (busFromState) {
        setBus(busFromState);
        setError('');
        return;
      }

      try {
        const response = await axios.get(`${API_BASE_URL}/buses/${id}`);
        setBus(response.data);
      } catch (fetchError) {
        setError('Unable to load bus details right now. Please try again.');
      }
    };
    fetchBus();
  }, [id, busFromState]);

  const serviceNumber = useMemo(() => getServiceNumber(bus), [bus]);

  const getBusLayoutConfig = (type) => {
    const normalized = String(type || '').toLowerCase();
    if (normalized.includes('2+1')) {
      return {
        columns: 4,
        pattern: ['seat', 'seat', 'empty', 'seat'],
        label: '2+1 layout',
        sleeper: false,
        positionMap: ['window', 'aisle', null, 'window']
      };
    }
    if (normalized.includes('2+2')) {
      return {
        columns: 4,
        pattern: ['seat', 'seat', 'seat', 'seat'],
        label: '2+2 layout',
        sleeper: false,
        positionMap: ['window', 'aisle', 'aisle', 'window']
      };
    }
    if (normalized.includes('semi sleeper') || normalized.includes('semi-sleeper')) {
      return {
        columns: 3,
        pattern: ['seat', 'empty', 'seat'],
        label: 'Semi sleeper layout',
        sleeper: true,
        positionMap: ['window', null, 'aisle']
      };
    }
    if (normalized.includes('sleeper')) {
      return {
        columns: 3,
        pattern: ['seat', 'empty', 'seat'],
        label: 'Sleeper layout',
        sleeper: true,
        positionMap: ['window', null, 'aisle']
      };
    }
    if (normalized.includes('multi') || normalized.includes('axle')) {
      return {
        columns: 4,
        pattern: ['seat', 'seat', 'seat', 'seat'],
        label: 'Multi-axle layout',
        sleeper: false,
        positionMap: ['window', 'aisle', 'aisle', 'window']
      };
    }
    if (normalized.includes('ac')) {
      return {
        columns: 4,
        pattern: ['seat', 'seat', 'seat', 'seat'],
        label: 'AC layout',
        sleeper: false,
        positionMap: ['window', 'aisle', 'aisle', 'window']
      };
    }
    return {
      columns: 4,
      pattern: ['seat', 'seat', 'seat', 'seat'],
      label: 'Standard layout',
      sleeper: false,
      positionMap: ['window', 'aisle', 'aisle', 'window']
    };
  };

  const isSeatVisible = (seat) => {
    if (seatFilter === 'all') return true;
    if (seatFilter === 'occupied') return seat.occupied;
    if (seatFilter === 'available') return !seat.occupied && !seat.selected;
    if (seatFilter === 'selected') return seat.selected;
    if (seatFilter === 'window') return seat.position === 'window';
    if (seatFilter === 'aisle') return seat.position === 'aisle';
    return true;
  };

  const seatLayout = useMemo(() => {
    if (!bus) return { layoutLabel: 'Loading layout...', rows: [], columns: 4, sleeper: false };

    const totalSeats = Number(bus.seats) || 0;
    const occupied = getOccupiedSeats(totalSeats, Number(bus.availableSeats), bus._id);
    const config = getBusLayoutConfig(bus.busType);

    const rows = [];
    let seatNumber = 1;
    while (seatNumber <= totalSeats) {
      const row = config.pattern.map((patternCell, colIndex) => {
        if (patternCell !== 'seat') {
          return { type: 'empty' };
        }

        if (seatNumber > totalSeats) {
          return { type: 'empty' };
        }

        const selected = selectedSeats.includes(seatNumber);
        const occupiedSeat = occupied.has(seatNumber);
        const position = config.positionMap?.[colIndex] || 'seat';
        const seat = {
          type: 'seat',
          number: seatNumber,
          occupied: occupiedSeat,
          selected,
          position,
          visible: false
        };
        seat.visible = isSeatVisible(seat);
        seatNumber += 1;
        return seat;
      });
      rows.push(row);
    }

    return {
      layoutLabel: config.label,
      rows,
      columns: config.columns,
      sleeper: config.sleeper
    };
  }, [bus, selectedSeats, seatFilter]);

  const handleSeatClick = (seat) => {
    if (!seat || seat.occupied) return;
    if (selectedSeats.includes(seat.number)) {
      setSelectedSeats(selectedSeats.filter((s) => s !== seat.number));
    } else {
      setSelectedSeats([...selectedSeats, seat.number]);
    }
  };

  const handleContinue = async () => {
    const token = localStorage.getItem('token');

    if (!token) {
      setError('Please sign in first. Booking requires authentication.');
      return;
    }

    if (!selectedSeats.length) {
      setError('Please select at least one seat to continue.');
      return;
    }

    setError('');
    setIsSubmitting(true);
    try {
      if (String(id || '').startsWith('synthetic-')) {
        const booking = {
          _id: `local-${Date.now()}`,
          bus: bus,
          busId: id,
          seats: selectedSeats,
          status: 'confirmed',
          paymentReferenceId: `local_pay_${Date.now()}`,
          createdAt: new Date().toISOString()
        };
        saveLocalBooking(booking);
        navigate('/checkout-info', { state: { booking, bus } });
        return;
      }

      const response = await axios.post(`${API_BASE_URL}/bookings`, {
        busId: id,
        seats: selectedSeats
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      navigate('/checkout-info', { state: { booking: response.data.booking, bus } });
    } catch (bookingError) {
      if (bookingError?.response?.status === 401) {
        setError('Your session is not authorized. Please sign in again and retry.');
        return;
      }
      const message = bookingError?.response?.data?.message || 'Booking failed. Please try again in a moment.';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!bus && !error) return <div>Loading...</div>;

  if (!bus && error) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <h1 className="text-2xl font-bold mb-6">Select Seats</h1>
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mb-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Service Number</p>
            <h1 className="mt-2 text-3xl font-extrabold text-slate-900">{serviceNumber}</h1>
            <p className="mt-2 text-sm text-slate-600">{bus.operator || 'Unknown Operator'} • {bus.busType || 'Standard'}</p>
          </div>
          <div className="rounded-3xl bg-slate-50 px-5 py-4 text-right">
            <p className="text-sm uppercase tracking-[0.18em] text-slate-500">Seats Left</p>
            <p className="mt-2 text-3xl font-bold text-slate-900">{bus.availableSeats ?? 0}</p>
            <p className="text-sm text-slate-500">Total seats: {bus.seats || 0}</p>
          </div>
        </div>
      </div>

      {error ? <p className="mb-4 text-red-600">{error}</p> : null}

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div>
          <div className="mb-4 grid gap-3 sm:grid-cols-4">
            {seatFilterOptions.map((option) => {
              const isActive = seatFilter === option.key;
              const buttonClasses = isActive
                ? 'border-[#dc5f59] bg-[#dc5f59] text-white shadow-lg'
                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100';
              const iconClasses = isActive
                ? 'h-10 w-10 rounded-2xl border border-white bg-white text-[#dc5f59]'
                : 'h-10 w-10 rounded-2xl border border-slate-200 bg-white';
              const descriptionClasses = isActive ? 'mt-1 text-xs font-normal text-slate-200' : 'mt-1 text-xs font-normal text-slate-500';
              return (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => setSeatFilter(option.key)}
                  className={`flex items-center gap-3 rounded-3xl border px-4 py-3 text-left text-sm font-semibold transition ${buttonClasses}`}
                >
                  <div className={iconClasses} />
                  <div>
                    <div>{option.label}</div>
                    <div className={descriptionClasses}>{option.description}</div>
                  </div>
                </button>
              );
            })}
          </div>
          <div className="mx-auto max-w-[620px] rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-4 rounded-3xl border border-slate-200 bg-slate-50 px-4 py-2 text-center text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">
          {seatLayout.layoutLabel}
        </div>
        <div className="mb-4 grid place-items-center">
          <div className="grid w-full max-w-[270px] grid-cols-[auto_1fr] items-center gap-3 rounded-3xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 shadow-sm">
            <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-slate-100 text-2xl">🛞</div>
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-500">Driver area</div>
              <div className="mt-1 text-xs text-slate-700">Front row with aisle view.</div>
            </div>
          </div>
        </div>
        <div className="mx-auto w-max max-w-full space-y-2 overflow-x-auto pb-2">
          {seatLayout.rows.map((row, rowIndex) => (
            <div
              key={rowIndex}
              className="grid gap-2"
              style={{ gridTemplateColumns: `repeat(${seatLayout.columns}, 4.5rem)` }}
            >
              {row.map((cell, cellIndex) => {
                if (cell.type === 'empty') {
                  return <div key={cellIndex} className="h-14 rounded-2xl border border-transparent bg-transparent" />;
                }

                const isSelected = cell.selected;
                const isOccupied = cell.occupied;
                const seatClasses = `group h-14 rounded-2xl border p-2 text-left text-xs font-semibold transition ${isOccupied ? 'cursor-not-allowed border-slate-300 bg-slate-200 text-slate-500' : isSelected ? 'border-[#b3261e] bg-[#f9e5e2] text-[#b3261e] shadow-[0_0_0_3px_rgba(220,95,89,0.12)]' : 'border-slate-200 bg-white text-slate-700 hover:border-[#dc5f59] hover:bg-[#fef0ee]'} ${!cell.visible ? 'opacity-30 pointer-events-none' : ''}`;

                return (
                  <button
                    key={cellIndex}
                    type="button"
                    onClick={() => handleSeatClick(cell)}
                    disabled={isOccupied || !cell.visible}
                    className={seatClasses}
                  >
                    <div className="text-[9px] uppercase tracking-[0.14em] text-slate-500">Seat</div>
                    <div className="mt-1 text-base font-bold text-slate-900">{cell.number}</div>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold text-slate-900 mb-4">Booking Summary</h2>
          <p className="text-sm text-slate-600">Route: {bus.source || 'Unknown'} → {bus.destination || 'Unknown'}</p>
          <p className="mt-2 text-sm text-slate-600">Departure: {formatTime(bus.departure, 'en-US', { hour: '2-digit', minute: '2-digit' })}</p>
          <p className="text-sm text-slate-600">Arrival: {formatTime(bus.arrival, 'en-US', { hour: '2-digit', minute: '2-digit' })}</p>
          <p className="mt-2 text-sm text-blue-600 font-semibold">
            Travel Time: {bus.durationDisplay || formatDuration(bus.durationMinutes)}
          </p>
          {bus.distance && <p className="text-sm text-slate-600">Distance: {bus.distance} km</p>}
          <p className="mt-4 text-sm text-slate-700">Selected seats: {selectedSeats.length ? selectedSeats.join(', ') : 'None'}</p>
          <button
            onClick={handleContinue}
            disabled={isSubmitting || !selectedSeats.length}
            className="mt-6 w-full rounded-3xl bg-[#dc5f59] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#bd4c4a] disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Booking...' : 'Continue'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Booking;
