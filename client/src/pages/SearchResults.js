import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import axios from 'axios';
import { formatDate, formatTime, formatDuration } from '../utils/dateTime';

const busTypes = [
  { label: 'All', icon: '⚪' },
  { label: 'Non AC', icon: '🚍' },
  { label: 'Seater', icon: '💺' },
  { label: 'AC', icon: '❄️' },
  { label: 'Sleeper', icon: '🛌' }
];

const normalizeBusType = (value) =>
  String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

const parseLocalDate = (value) => {
  const parts = String(value || '').split('-').map((part) => Number(part));
  if (parts.length !== 3 || parts.some((part) => !Number.isFinite(part))) {
    return null;
  }
  return new Date(parts[0], parts[1] - 1, parts[2]);
};

const timeSlots = ['Any Time', 'Before 10 AM', '10 AM - 5 PM', '5 PM - 11 PM', 'After 11 PM'];
const defaultPartners = [
  'Any Operator',
  'KSRTC Karnataka',
  'KTCL',
  'Streamline Tours',
  'RedLine Travels',
  'SRS Travels',
  'VRL Travels',
  'Orange Tours',
  'Kallada Tours',
  'PNR Express'
];
const boardingPoints = ['Any Boarding', 'Majestic', 'Marathahalli', 'Silk Board', 'Madiwala'];
const droppingPoints = ['Any Dropping', 'Electronic City', 'Yesvantpur', 'Anand Rao Circle', 'Tin Factory'];

const SearchResults = () => {
  const [searchParams] = useSearchParams();
  const [buses, setBuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedBusType, setSelectedBusType] = useState('All');
  const [selectedTime, setSelectedTime] = useState('Any Time');
  const [selectedPartner, setSelectedPartner] = useState('Any Operator');
  const [selectedBoarding, setSelectedBoarding] = useState('Any Boarding');
  const [selectedDropping, setSelectedDropping] = useState('Any Dropping');
  const [selectedPriceRange, setSelectedPriceRange] = useState({ min: 0, max: 0 });

  const from = searchParams.get('from') || '';
  const to = searchParams.get('to') || '';
  const date = searchParams.get('date') || '';

  const dateLabel = useMemo(() => {
    if (!date) return 'Choose date';
    const localDate = parseLocalDate(date);
    if (!localDate) return 'Choose date';
    return localDate.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  }, [date]);

  useEffect(() => {
    const fetchBuses = async () => {
      if (!from || !to || !date) {
        setBuses([]);
        setLoading(false);
        return;
      }

      const localDate = parseLocalDate(date);
      if (!localDate) {
        setBuses([]);
        setLoading(false);
        setError('Invalid travel date selected.');
        return;
      }

      setLoading(true);
      setError('');

      try {
        const response = await axios.get(`http://localhost:5000/api/buses/search?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&date=${encodeURIComponent(date)}`);
        setBuses(response.data || []);
      } catch (fetchError) {
        setBuses([]);
        setError('Unable to load buses right now. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchBuses();
  }, [from, to, date]);

  const busPriceRange = useMemo(() => {
    if (!buses.length) {
      return { min: 0, max: 0 };
    }

    const prices = buses.map((bus) => Number(bus.price || 0)).filter((price) => price >= 0);
    return {
      min: prices.length > 0 ? Math.min(...prices) : 0,
      max: prices.length > 0 ? Math.max(...prices) : 0
    };
  }, [buses]);

  useEffect(() => {
    if (buses.length) {
      setSelectedPriceRange({
        min: busPriceRange.min,
        max: busPriceRange.max
      });
    }
  }, [busPriceRange.min, busPriceRange.max, buses.length]);

  const operatorOptions = useMemo(() => {
    const operators = new Set(defaultPartners.filter(Boolean));
    buses.forEach((bus) => {
      if (bus.operator) operators.add(bus.operator);
    });
    return Array.from(operators);
  }, [buses]);

  const boardingOptions = useMemo(() => {
    const points = new Set(['Any Boarding']);

    buses.forEach((bus) => {
      const boarding = bus.boardingPoint || bus.source;
      if (boarding) {
        points.add(boarding);
      }
    });

    return Array.from(points);
  }, [buses]);

  const droppingOptions = useMemo(() => {
    const points = new Set(['Any Dropping']);

    buses.forEach((bus) => {
      const dropping = bus.droppingPoint || bus.destination;
      if (dropping) {
        points.add(dropping);
      }
    });

    return Array.from(points);
  }, [buses]);

  const filteredBuses = useMemo(() => {
    return buses.filter((bus) => {
      const price = Number(bus.price || 0);

      if (selectedPartner !== 'Any Operator' && bus.operator !== selectedPartner) {
        return false;
      }

      if (selectedBusType !== 'All') {
        const normalizedBusType = normalizeBusType(bus.busType);
        const normalizedSelection = normalizeBusType(selectedBusType);

        if (!normalizedBusType.includes(normalizedSelection)) {
          return false;
        }
      }

      if (selectedTime !== 'Any Time') {
        const departureDate = new Date(bus.departure);
        const departureMinutes = departureDate.getHours() * 60 + departureDate.getMinutes();

        if (selectedTime === 'Before 10 AM' && departureMinutes >= 10 * 60) return false;
        if (selectedTime === '10 AM - 5 PM' && (departureMinutes < 10 * 60 || departureMinutes >= 17 * 60)) return false;
        if (selectedTime === '5 PM - 11 PM' && (departureMinutes < 17 * 60 || departureMinutes >= 23 * 60)) return false;
        if (selectedTime === 'After 11 PM' && departureMinutes < 23 * 60) return false;
      }

      if (selectedPriceRange.min > 0 && price < selectedPriceRange.min) return false;
      if (selectedPriceRange.max > 0 && price > selectedPriceRange.max) return false;

      const boardingPoint = bus.boardingPoint || bus.source || '';
      if (selectedBoarding !== 'Any Boarding' && selectedBoarding !== boardingPoint) return false;

      const droppingPoint = bus.droppingPoint || bus.destination || '';
      if (selectedDropping !== 'Any Dropping' && selectedDropping !== droppingPoint) return false;

      return true;
    });
  }, [
    buses,
    selectedBusType,
    selectedTime,
    selectedPartner,
    selectedBoarding,
    selectedDropping,
    selectedPriceRange
  ]);

  useEffect(() => {
    if (selectedBoarding !== 'Any Boarding' && !boardingOptions.includes(selectedBoarding)) {
      setSelectedBoarding('Any Boarding');
    }

    if (selectedDropping !== 'Any Dropping' && !droppingOptions.includes(selectedDropping)) {
      setSelectedDropping('Any Dropping');
    }
  }, [boardingOptions, droppingOptions, selectedBoarding, selectedDropping]);

  const handleClearFilters = () => {
    setSelectedBusType('All');
    setSelectedTime('Any Time');
    setSelectedPartner('Any Operator');
    setSelectedBoarding('Any Boarding');
    setSelectedDropping('Any Dropping');
    setSelectedPriceRange({
      min: busPriceRange.min,
      max: busPriceRange.max
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-12">
      <div className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 rounded-[32px] bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_minmax(220px,1fr)] lg:grid-cols-[1.7fr_auto_1.7fr_auto]">
            <div className="rounded-3xl border border-slate-200 bg-slate-50 px-5 py-4">
              <div className="flex items-center gap-3 text-slate-500 text-sm font-semibold uppercase tracking-[0.15em]">From</div>
              <p className="mt-3 text-xl font-bold text-slate-900">{from || 'Bangalore'}</p>
            </div>
            <div className="flex items-center justify-center text-slate-400">↔</div>
            <div className="rounded-3xl border border-slate-200 bg-slate-50 px-5 py-4">
              <div className="flex items-center gap-3 text-slate-500 text-sm font-semibold uppercase tracking-[0.15em]">To</div>
              <p className="mt-3 text-xl font-bold text-slate-900">{to || 'Goa'}</p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-slate-50 px-5 py-4">
              <div className="flex items-center gap-3 text-slate-500 text-sm font-semibold uppercase tracking-[0.15em]">Departure</div>
              <p className="mt-3 text-xl font-bold text-slate-900">{dateLabel}</p>
            </div>
            <button
              type="button"
              className="rounded-3xl bg-[#dc5f59] px-6 py-4 text-sm font-bold uppercase tracking-[0.12em] text-white transition hover:bg-[#bd4c4a]"
            >
              Search
            </button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="rounded-[32px] bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-slate-900">Filters</h2>
              <button
                type="button"
                onClick={handleClearFilters}
                className="text-sm font-semibold text-slate-500 hover:text-slate-900"
              >
                Clear All
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Bus Type</h3>
                <div className="grid grid-cols-2 gap-3">
                  {busTypes.map((type) => (
                    <button
                      key={type.label}
                      type="button"
                      onClick={() => setSelectedBusType(type.label)}
                      className={`rounded-3xl border px-4 py-3 text-left text-sm font-semibold transition ${selectedBusType === type.label ? 'border-[#dc5f59] bg-[#fdecea] text-[#b3261e]' : 'border-slate-200 bg-slate-50 text-slate-700'}`}
                    >
                      <span className="block text-xl">{type.icon}</span>
                      <span className="mt-2 block">{type.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Price Range</h3>
                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                  <div className="mb-3 flex items-center justify-between text-sm text-slate-700">
                    <span>₹{busPriceRange.min}</span>
                    <span>₹{selectedPriceRange.min} - ₹{selectedPriceRange.max}</span>
                    <span>₹{busPriceRange.max}</span>
                  </div>
                  <div className="space-y-3">
                    <input
                      type="range"
                      min={busPriceRange.min}
                      max={busPriceRange.max}
                      value={selectedPriceRange.min}
                      onChange={(event) => {
                        const value = Number(event.target.value);
                        setSelectedPriceRange((prev) => ({
                          ...prev,
                          min: Math.min(value, prev.max)
                        }));
                      }}
                      className="w-full accent-[#dc5f59]"
                    />
                    <input
                      type="range"
                      min={busPriceRange.min}
                      max={busPriceRange.max}
                      value={selectedPriceRange.max}
                      onChange={(event) => {
                        const value = Number(event.target.value);
                        setSelectedPriceRange((prev) => ({
                          ...prev,
                          max: Math.max(value, prev.min)
                        }));
                      }}
                      className="w-full accent-[#dc5f59]"
                    />
                  </div>
                </div>
              </div>

              <div>
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Departure Time</h3>
                <div className="grid gap-3">
                  {timeSlots.map((slot) => (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => setSelectedTime(slot)}
                      className={`rounded-3xl border px-4 py-3 text-left text-sm font-semibold transition ${selectedTime === slot ? 'border-[#dc5f59] bg-[#fdecea] text-[#b3261e]' : 'border-slate-200 bg-slate-50 text-slate-700'}`}
                    >
                      {slot}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-500 mb-3">Bus Partner</label>
                <select
                  value={selectedPartner}
                  onChange={(event) => setSelectedPartner(event.target.value)}
                  className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none"
                >
                  {operatorOptions.map((partner) => (
                    <option key={partner} value={partner}>{partner}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-500 mb-3">Boarding Point</label>
                <select
                  value={selectedBoarding}
                  onChange={(event) => setSelectedBoarding(event.target.value)}
                  className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none"
                >
                  {boardingOptions.map((point) => (
                    <option key={point} value={point}>{point}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-500 mb-3">Dropping Point</label>
                <select
                  value={selectedDropping}
                  onChange={(event) => setSelectedDropping(event.target.value)}
                  className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none"
                >
                  {droppingOptions.map((point) => (
                    <option key={point} value={point}>{point}</option>
                  ))}
                </select>
              </div>
            </div>
          </aside>

          <main>
            <div className="mb-5 rounded-[32px] bg-white p-6 shadow-sm ring-1 ring-slate-200">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Showing {filteredBuses.length} buses on this route</p>
                  <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900">{from} → {to}</h1>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2">Price ↑</span>
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2">Seats ↑</span>
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2">Ratings ↑</span>
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2">Departure ↑</span>
                </div>
              </div>
            </div>

            <div className="space-y-5">
              {loading ? (
                <div className="rounded-[32px] bg-white p-10 text-center text-slate-600 shadow-sm ring-1 ring-slate-200">Loading buses...</div>
              ) : error ? (
                <div className="rounded-[32px] bg-white p-10 text-center text-red-600 shadow-sm ring-1 ring-slate-200">{error}</div>
              ) : buses.length === 0 ? (
                <div className="rounded-[32px] bg-white p-10 text-center text-slate-700 shadow-sm ring-1 ring-slate-200">
                  No buses found for this route on the selected date.
                </div>
              ) : (
                filteredBuses.map((bus) => (
                  <article key={bus._id} className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-3 text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
                          <span>{bus.operator || 'Unknown Operator'}</span>
                          <span className="rounded-full bg-emerald-100 px-2 py-1 text-emerald-700">4★</span>
                          <span>{bus.availableSeats} Seats Available</span>
                        </div>
                        <h2 className="mt-3 text-2xl font-bold text-slate-900">{bus.route}</h2>
                        <p className="mt-1 text-sm text-slate-500">{bus.busType || 'Standard'} • {bus.status || 'On time'}</p>
                        <p className="mt-2 text-sm text-slate-500">
                          Boarding: {bus.boardingPoint || bus.source || from || 'N/A'} • Dropping: {bus.droppingPoint || bus.destination || to || 'N/A'}
                        </p>
                      </div>
                      <div className="flex flex-col gap-4 rounded-[28px] border border-slate-200 bg-slate-50 p-4 text-right">
                        <div className="text-sm uppercase tracking-[0.16em] text-slate-500">From</div>
                        <div className="text-xl font-bold text-slate-900">{formatTime(bus.departure, 'en-US', { hour: '2-digit', minute: '2-digit' })}</div>
                        <div className="text-sm text-slate-500">{formatDate(bus.departure, 'en-IN')}</div>
                      </div>
                      <div className="flex flex-col gap-4 rounded-[28px] border border-slate-200 bg-slate-50 p-4 text-right">
                        <div className="text-sm uppercase tracking-[0.16em] text-slate-500">Arrive</div>
                        <div className="text-xl font-bold text-slate-900">{formatTime(bus.arrival, 'en-US', { hour: '2-digit', minute: '2-digit' })}</div>
                        <div className="text-sm text-slate-500">{formatDate(bus.arrival, 'en-IN')}</div>
                      </div>
                      <div className="flex flex-col gap-4 rounded-[28px] border border-slate-200 bg-blue-50 p-4 text-right">
                        <div className="text-sm uppercase tracking-[0.16em] text-blue-700">Travel Time</div>
                        <div className="text-xl font-bold text-blue-900">
                          {bus.durationDisplay || formatDuration(bus.durationMinutes)}
                        </div>
                        <div className="text-sm text-blue-600">{bus.distance ? `${bus.distance} km` : 'Distance N/A'}</div>
                      </div>
                      <div className="flex flex-col items-end justify-between gap-4">
                        <div className="text-sm text-slate-500">From</div>
                        <div className="text-3xl font-extrabold text-slate-900">₹{bus.price}</div>
                        <Link
                          to={`/booking/${bus._id}`}
                          state={{ bus }}
                          className="inline-flex rounded-3xl bg-[#dc5f59] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#bd4c4a]"
                        >
                          View Buses
                        </Link>
                      </div>
                    </div>
                  </article>
                ))
              )}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default SearchResults;
