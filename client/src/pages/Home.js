import React, { useContext, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import AuthContext from '../context/AuthContext';
import passengersBusLogo from '../assets/passengers-bus-logo-transparent.png';
import busBookingIllustration from '../assets/bus-booking-illustration.svg';
import busPaymentIllustration from '../assets/bus-payment-illustration.svg';
import busStopIllustration from '../assets/bus-stop-illustration.svg';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const CITY_SUGGESTIONS = [
  'Agra',
  'Ahmedabad',
  'Ajmer',
  'Amritsar',
  'Bangalore',
  'Bengaluru',
  'Bhopal',
  'Bhubaneswar',
  'Chandigarh',
  'Chennai',
  'Coimbatore',
  'Delhi',
  'Goa',
  'Gurgaon',
  'Guwahati',
  'Hyderabad',
  'Indore',
  'Jaipur',
  'Kanpur',
  'Kochi',
  'Kolkata',
  'Lucknow',
  'Madurai',
  'Mangalore',
  'Mumbai',
  'Mysore',
  'Nagpur',
  'Nashik',
  'Noida',
  'Patna',
  'Pune',
  'Rajkot',
  'Surat',
  'Thiruvananthapuram',
  'Udaipur',
  'Vadodara',
  'Visakhapatnam'
];

const ROUTE_SUGGESTIONS = {
  bangalore: ['Hyderabad', 'Chennai', 'Pune', 'Goa', 'Mumbai', 'Mysore', 'Mangalore'],
  bengaluru: ['Hyderabad', 'Chennai', 'Pune', 'Goa', 'Mumbai', 'Mysore', 'Mangalore'],
  chennai: ['Bangalore', 'Hyderabad', 'Coimbatore', 'Madurai', 'Pondicherry'],
  delhi: ['Agra', 'Jaipur', 'Chandigarh', 'Lucknow', 'Kanpur', 'Gurgaon'],
  hyderabad: ['Bangalore', 'Chennai', 'Pune', 'Mumbai', 'Vijayawada'],
  mumbai: ['Pune', 'Ahmedabad', 'Goa', 'Bangalore', 'Hyderabad', 'Surat'],
  pune: ['Mumbai', 'Bangalore', 'Hyderabad', 'Ahmedabad', 'Nashik']
};

function normalizeSuggestion(value) {
  return String(value || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
}

function getLocalSuggestions(query, { from = '', field = 'source', limit = 8 } = {}) {
  const normalizedQuery = normalizeSuggestion(query);
  const normalizedFrom = normalizeSuggestion(from);
  const pool = field === 'destination' && ROUTE_SUGGESTIONS[normalizedFrom]
    ? ROUTE_SUGGESTIONS[normalizedFrom]
    : CITY_SUGGESTIONS;

  if (!normalizedQuery) {
    return [];
  }

  return pool
    .filter((city) => normalizeSuggestion(city).startsWith(normalizedQuery))
    .slice(0, limit);
}

const AuthModal = ({ mode, onClose, onModeChange, onAuthSuccess }) => {
  const isSignup = mode === 'signup';
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const title = isSignup ? 'Create your account' : 'Login to Bus Booking';
  const submitText = isSignup ? 'Sign Up' : 'Login';

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (isSignup && !name.trim()) {
      setError('Please enter your name.');
      return;
    }

    if (!email.trim() || !password.trim()) {
      setError('Please enter your email and password.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (isSignup) {
        await axios.post(`${API_BASE_URL}/auth/register`, {
          name: name.trim(),
          email: email.trim(),
          password
        });
      }

      const response = await axios.post(`${API_BASE_URL}/auth/login`, {
        email: email.trim(),
        password
      });

      const user = response.data.user || {
        name: isSignup ? name.trim() : email.trim().split('@')[0],
        email: email.trim()
      };

      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(user));
      onAuthSuccess(user, response.data.token);
      onClose();
    } catch (authError) {
      setError(authError?.response?.data?.message || 'Unable to continue. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 px-4 py-6">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-lg bg-white shadow-2xl md:grid-cols-[0.72fr_1fr]">
        <div className="relative hidden min-h-[520px] overflow-hidden bg-[#d92f3b] p-8 text-white md:block">
            <div className="absolute -left-12 top-10 h-36 w-36 rounded-lg bg-[#ffcf5a] opacity-80 rotate-12" />
            <div className="absolute right-10 top-16 h-28 w-28 rounded-lg bg-[#ff765f] opacity-90 -rotate-12" />
            <div className="absolute bottom-14 right-12 h-24 w-24 rounded-lg bg-[#ffcf5a] opacity-80 rotate-12" />
            <div className="relative z-10 flex h-full flex-col justify-center">
              <div className="mb-8 inline-flex items-center gap-3 rounded-full bg-white/20 px-5 py-2 text-lg font-bold uppercase tracking-[0.24em] text-white shadow-lg">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/30 text-xl">🚌</span>
                Bus Booking
              </div>
              <div className="rounded-[2.5rem] border border-white/25 bg-white/10 p-6 shadow-2xl backdrop-blur-sm">
                <div className="relative overflow-hidden rounded-[2rem] bg-[#ff7a5a]/20 p-6">
                  <div className="absolute inset-x-0 top-0 h-24 bg-white/10 blur-2xl" />
                  <div className="relative flex items-center justify-between gap-5">
                    <div className="space-y-4">
                      <div className="h-12 w-28 rounded-3xl bg-white/80" />
                      <div className="h-5 w-24 rounded-full bg-white/60" />
                      <div className="h-5 w-20 rounded-full bg-white/40" />
                    </div>
                    <div className="relative h-28 w-28 rounded-[2.5rem] bg-[#c93d2f] shadow-2xl shadow-[#c93d2f]/40">
                      <div className="absolute left-4 top-4 h-6 w-6 rounded-full bg-white" />
                      <div className="absolute right-4 top-4 h-6 w-6 rounded-full bg-white" />
                      <div className="absolute left-5 bottom-6 h-3 w-16 rounded-full bg-white/60" />
                      <div className="absolute inset-x-0 bottom-0 h-8 bg-[#7d1a18] rounded-b-[2.5rem]" />
                    </div>
                  </div>
                </div>
                <p className="mt-6 text-sm font-semibold text-white/85">
                  Fast ticket booking, route planning, and real-time bus tracking across India.
                </p>
              </div>
            </div>
          </div>
        <div className="relative p-7 md:p-10">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close login popup"
            className="absolute right-5 top-5 text-4xl leading-none text-slate-500 hover:text-slate-800"
          >
            &times;
          </button>

          <h2 className="pr-10 text-3xl font-semibold text-slate-900">{title}</h2>
          <p className="mt-6 text-lg font-semibold text-slate-500">
            {isSignup ? 'Enter your details to start booking' : 'Enter your email to continue'}
          </p>

          <form onSubmit={handleSubmit} className="mt-5 space-y-5">
            {isSignup ? (
              <input
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Full name"
                className="w-full rounded-lg border border-slate-300 px-4 py-4 text-lg outline-none transition focus:border-[#df6b57]"
              />
            ) : null}

            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Email address"
              className="w-full rounded-lg border border-slate-300 px-4 py-4 text-lg outline-none transition focus:border-[#df6b57]"
            />

            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Password"
              className="w-full rounded-lg border border-slate-300 px-4 py-4 text-lg outline-none transition focus:border-[#df6b57]"
            />

            {error ? <p className="rounded bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p> : null}

            <button
              type="submit"
              disabled={isSubmitting}
              className="mx-auto block w-full max-w-60 rounded bg-[#df6b57] px-8 py-4 text-lg font-bold text-white transition hover:bg-[#c75845] disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {isSubmitting ? 'Please wait...' : submitText}
            </button>
          </form>

          <p className="mt-8 text-center text-sm font-semibold text-slate-600">
            {isSignup ? 'Already have an account?' : 'New to Bus Booking?'}{' '}
            <button
              type="button"
              onClick={() => {
                setError('');
                onModeChange(isSignup ? 'login' : 'signup');
              }}
              className="font-extrabold text-[#b3261e] underline"
            >
              {isSignup ? 'Login' : 'Sign Up'}
            </button>
          </p>

          <p className="mt-5 text-center text-sm text-slate-500">
            By continuing, you agree to our terms of use and privacy policy.
          </p>
        </div>
      </div>
    </div>
  );
};

const TrackTicketModal = ({ onClose, onTrack }) => {
  const [trackId, setTrackId] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (event) => {
    event.preventDefault();
    setError('');

    if (!trackId.trim() || !mobileNumber.trim()) {
      setError('Please enter both Track ID and mobile number.');
      return;
    }

    onTrack(trackId.trim());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 px-4 py-6">
      <div className="relative w-full max-w-6xl overflow-hidden rounded-lg bg-white p-8 shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close track ticket popup"
          className="absolute right-5 top-4 text-3xl leading-none text-slate-500 hover:text-slate-800"
        >
          &times;
        </button>

        <div className="mb-8 border-b border-dashed border-orange-400 pb-7">
          <h2 className="text-3xl font-extrabold text-slate-950">Track Ticket</h2>
          <p className="mt-2 text-base font-semibold text-slate-500">Enter the Track ID shown on your tracking page to view live ticket status.</p>
        </div>

        <form onSubmit={handleSubmit} className="grid gap-5 lg:grid-cols-[1fr_1fr_auto] lg:items-end">
          <label className="block">
            <span className="mb-2 block text-base font-bold text-slate-600">Track ID</span>
            <input
              type="text"
              value={trackId}
              onChange={(event) => setTrackId(event.target.value)}
              placeholder="Example: TRK-12345678"
              className="w-full rounded-lg border border-slate-300 px-4 py-4 text-lg font-semibold outline-none focus:border-[#dc5f59]"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-base font-bold text-slate-600">Mobile Number</span>
            <div className="flex rounded-lg border border-slate-300 px-4 py-4 text-lg font-semibold focus-within:border-[#dc5f59]">
              <span className="mr-3 text-slate-700">+91</span>
              <input
                type="tel"
                value={mobileNumber}
                onChange={(event) => setMobileNumber(event.target.value)}
                placeholder="Please enter the mobile number"
                className="w-full outline-none"
              />
            </div>
          </label>

          <button
            type="submit"
            className="rounded-lg bg-[#dc5f59] px-10 py-4 text-lg font-extrabold text-white hover:bg-[#c94f4a]"
          >
            Ticket Details
          </button>
        </form>

        {error ? <p className="mt-4 text-sm font-semibold text-red-600">{error}</p> : null}
      </div>
    </div>
  );
};

const AccountMenu = ({ user, onLogout, onNavigate }) => {
  const [isOpen, setIsOpen] = useState(false);
  const displayName = user?.name || 'My Account';
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className="flex max-w-56 items-center gap-3 rounded-lg bg-white/80 px-4 py-3 text-[#d95f53] shadow-sm transition hover:bg-white"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#d95f53] text-sm font-extrabold text-white">
          {initial}
        </span>
        <span className="truncate font-bold">{displayName}</span>
      </button>

      {isOpen ? (
        <div className="absolute right-0 top-[calc(100%+0.7rem)] z-30 w-80 rounded-lg bg-white p-6 text-left shadow-2xl">
          <button
            type="button"
            onClick={() => onNavigate('profile')}
            className="flex w-full items-start gap-4 rounded-lg px-2 py-3 text-left hover:bg-slate-50"
          >
            <span className="mt-1 flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-sm font-extrabold text-slate-500">
              {initial}
            </span>
            <span>
              <span className="block text-xl font-extrabold text-slate-900">{displayName}</span>
              <span className="mt-1 block text-base font-semibold text-slate-500">My Profile</span>
            </span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('bookings')}
            className="flex w-full items-start gap-4 rounded-lg px-2 py-3 text-left hover:bg-slate-50"
          >
            <span className="mt-1 text-2xl text-slate-400">#</span>
            <span>
              <span className="block text-xl font-extrabold text-slate-900">My Bookings</span>
              <span className="mt-1 block text-base font-semibold text-slate-500">View & Manage bookings</span>
            </span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('travellers')}
            className="flex w-full items-start gap-4 rounded-lg px-2 py-3 text-left hover:bg-slate-50"
          >
            <span className="mt-1 text-2xl text-slate-400">+</span>
            <span>
              <span className="block text-xl font-extrabold text-slate-900">My Travellers</span>
              <span className="mt-1 block text-base font-semibold text-slate-500">View all saved travellers</span>
            </span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('billing')}
            className="flex w-full items-start gap-4 rounded-lg px-2 py-3 text-left hover:bg-slate-50"
          >
            <span className="mt-1 text-2xl text-slate-400">A</span>
            <span>
              <span className="block text-xl font-extrabold text-slate-900">Billing Address</span>
              <span className="mt-1 block text-base font-semibold text-slate-500">Manage saved billing details</span>
            </span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('notification')}
            className="flex w-full items-start gap-4 rounded-lg px-2 py-3 text-left hover:bg-slate-50"
          >
            <span className="mt-1 text-2xl text-slate-400">N</span>
            <span>
              <span className="block text-xl font-extrabold text-slate-900">Notification</span>
              <span className="mt-1 block text-base font-semibold text-slate-500">View account alerts</span>
            </span>
          </button>

          <button
            type="button"
            onClick={onLogout}
            className="mt-2 flex w-full items-center gap-4 rounded-lg px-2 py-3 text-left text-xl font-extrabold text-slate-900 hover:bg-slate-50"
          >
            <span className="text-2xl text-slate-400">{'>'}</span>
            Log out
          </button>
        </div>
      ) : null}
    </div>
  );
};

const Home = () => {
  const today = new Date();
  const maxDate = new Date(today);
  maxDate.setMonth(maxDate.getMonth() + 1);
  const minDateValue = today.toISOString().split('T')[0];
  const maxDateValue = maxDate.toISOString().split('T')[0];
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [date, setDate] = useState(minDateValue);
  const [fromSuggestions, setFromSuggestions] = useState([]);
  const [toSuggestions, setToSuggestions] = useState([]);
  const [isFetchingFrom, setIsFetchingFrom] = useState(false);
  const [isFetchingTo, setIsFetchingTo] = useState(false);
  const [activeField, setActiveField] = useState('');
  const [searchError, setSearchError] = useState('');
  const [authModalMode, setAuthModalMode] = useState(null);
  const [showTrackTicket, setShowTrackTicket] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowValue = tomorrow.toISOString().split('T')[0];
  const dateLabel = new Date(date).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
  const busTypes = [
    'AC Buses',
    'Non AC Buses',
    'Ordinary Buses',
    'Mini Buses',
    'Super Luxury Buses',
    'Volvo AC Buses',
    'Sleeper AC Buses',
    'Sleeper Buses',
    'Deluxe Buses',
    'Sleeper Cum Seater AC',
    'Double Decker Buses',
    'Mercedes buses',
    'Electric Buses',
    'Express Buses'
  ];
  const benefits = [
    'Avoid standing in long queues at offline bus ticket counters.',
    'No more hassle of approaching travel agents.',
    'Choose from multiple bus services.',
    'Book private and state transport bus tickets online.',
    'Check bus ticket availability online.',
    'Get bus timings, ticket price, boarding and dropping point details online.',
    'Access payment partner discounts and cashback offers.',
    'Free cancellation on eligible journeys.',
    '24/7 customer support.',
    'Every transaction is simple, safe and secure.'
  ];
  useEffect(() => {
    if (searchParams.get('trackTicket') === '1') {
      setShowTrackTicket(true);
      searchParams.delete('trackTicket');
      setSearchParams(searchParams, { replace: true });
    }

    const authMode = searchParams.get('auth');
    if (authMode === 'login' || authMode === 'signup') {
      setAuthModalMode(authMode);
    } else {
      setAuthModalMode(null);
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    let cancelled = false;

    const timeout = setTimeout(async () => {
      const query = from.trim();

      if (!query) {
        setFromSuggestions([]);
        setIsFetchingFrom(false);
        return;
      }

      setIsFetchingFrom(true);
      try {
        const response = await axios.get(`${API_BASE_URL}/buses/suggestions?q=${encodeURIComponent(query)}&field=source`);

        if (!cancelled) {
          setFromSuggestions(
            response.data?.length
              ? response.data
              : getLocalSuggestions(query, { field: 'source' })
          );
        }
      } catch (error) {
        if (!cancelled) {
          setFromSuggestions(getLocalSuggestions(query, { field: 'source' }));
        }
      } finally {
        if (!cancelled) {
          setIsFetchingFrom(false);
        }
      }
    }, 200);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [from]);

  useEffect(() => {
    let cancelled = false;

    const timeout = setTimeout(async () => {
      const query = to.trim();
      const source = from.trim();

      if (!query) {
        setToSuggestions([]);
        setIsFetchingTo(false);
        return;
      }

      setIsFetchingTo(true);
      try {
        const response = await axios.get(`${API_BASE_URL}/buses/suggestions?q=${encodeURIComponent(query)}&field=destination&from=${encodeURIComponent(source)}`);

        if (!cancelled) {
          setToSuggestions(
            response.data?.length
              ? response.data
              : getLocalSuggestions(query, { field: 'destination', from: source })
          );
        }
      } catch (error) {
        if (!cancelled) {
          setToSuggestions(getLocalSuggestions(query, { field: 'destination', from: source }));
        }
      } finally {
        if (!cancelled) {
          setIsFetchingTo(false);
        }
      }
    }, 200);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [to, from]);

  useEffect(() => {
    if (!from.trim()) {
      setTo('');
      setToSuggestions([]);
    }
  }, [from]);

  const handleSearch = () => {
    if (!from.trim()) {
      setSearchError('Please enter a source city.');
      return;
    }

    if (!to.trim()) {
      setSearchError('Please choose a destination city.');
      return;
    }

    if (!date) {
      setSearchError('Please select a departure date.');
      return;
    }

    setSearchError('');
    navigate(`/search?from=${from}&to=${to}&date=${date}`);
  };

  const handleTrackTicket = (trackId) => {
    setShowTrackTicket(false);
    navigate(`/tracking/${encodeURIComponent(trackId)}`);
  };

  const renderSuggestionPanel = (field) => {
    const suggestions = field === 'from' ? fromSuggestions : toSuggestions;

    if (activeField !== field || suggestions.length === 0) {
      return null;
    }

    return (
      <div className="absolute left-0 right-0 top-[calc(100%+0.6rem)] z-20 rounded-3xl border border-orange-100 bg-white p-2 shadow-2xl shadow-orange-100/50">
        {suggestions.map((city) => (
          <button
            key={`${field}-${city}`}
            type="button"
            onMouseDown={() => {
              if (field === 'from') {
                setFrom(city);
                setTo('');
                setToSuggestions([]);
              } else {
                setTo(city);
              }
              setActiveField('');
            }}
            className="block w-full rounded-2xl px-4 py-3 text-left text-sm font-semibold text-slate-700 transition hover:bg-orange-50"
          >
            {city}
          </button>
        ))}
      </div>
    );
  };

  return (
    <div className="app-shell bg-[#f4efe6]">
      <main className="mx-auto max-w-[1500px] px-5 pb-12 md:px-10">
        <section className="hero-illustration relative min-h-[360px] rounded-[2rem] px-6 py-8 shadow-[0_30px_80px_rgba(16,43,56,0.16)] md:min-h-[470px] md:px-10 md:py-10">
          <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-[#102b38]/30 via-[#102b38]/10 to-transparent" />
          <div className="absolute left-[10%] top-[18%] h-28 w-72 rounded-[999px] bg-[#f0dfb9]/55 blur-2xl md:h-36 md:w-96" />
          <div className="absolute right-[10%] top-[18%] h-32 w-52 rounded-[999px] bg-[#7a8e98]/25 blur-2xl md:h-36 md:w-80" />
          <div className="relative z-10 grid min-h-[inherit] gap-10 md:grid-cols-[0.95fr_1.05fr] md:items-center">
            <div className="hero-logo-wrap flex justify-center md:justify-start">
              <div className="hero-logo-stage flex h-[16rem] w-full max-w-[22rem] items-center justify-center md:h-[24rem] md:max-w-[34rem]">
                <img
                  src={passengersBusLogo}
                  alt="Passengers Bus logo"
                  className="hero-logo-image h-full w-full object-contain"
                />
              </div>
            </div>
            <div className="max-w-xl md:ml-auto md:text-right">
              <div className="inline-flex items-center gap-3 rounded-full border border-[#102b38]/10 bg-white/70 px-4 py-2 text-sm font-bold uppercase tracking-[0.3em] text-[#102b38] shadow-sm">
                <span className="h-2.5 w-2.5 rounded-full bg-[#102b38]" />
                Passengers Bus
              </div>
              <h1 className="mt-4 text-4xl font-extrabold leading-tight md:text-6xl">
                Search and track bus routes.
              </h1>
              <p className="mt-4 max-w-lg text-base leading-7 text-[#29414d] md:ml-auto md:text-lg">
                Live suggestions, date-aware search, and model-backed fallback routes for city pairs that are missing in the raw dataset.
              </p>
              <div className="mt-6 flex flex-wrap gap-3 md:justify-end">
                <span className="rounded-full border border-[#102b38]/10 bg-white/65 px-4 py-2 text-sm font-semibold text-[#405661] shadow-sm">
                  Live route suggestions
                </span>
                <span className="rounded-full border border-[#102b38]/10 bg-white/65 px-4 py-2 text-sm font-semibold text-[#405661] shadow-sm">
                  Real-time tracking
                </span>
                <span className="rounded-full border border-[#102b38]/10 bg-white/65 px-4 py-2 text-sm font-semibold text-[#405661] shadow-sm">
                  Smart route fallback
                </span>
              </div>
            </div>
          </div>
        </section>

        <section className="-mt-10 rounded-[2rem] bg-white p-5 shadow-[0_28px_60px_rgba(59,66,82,0.18)] md:-mt-16 md:p-8">
          <div className="flex flex-col gap-5 border-b border-slate-100 pb-5 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="inline-flex items-center rounded-full bg-[#fff1ec] px-4 py-2 text-sm font-bold text-[#b3261e]">
                Bus Booking
              </div>
              <h2 className="mt-4 text-2xl font-extrabold text-slate-900 md:text-4xl">India's fastest bus search, focused only on buses.</h2>
            </div>
            <div className="text-sm font-semibold text-slate-500">
              Available dates from today through next month
            </div>
          </div>

          <div className="mt-6 grid gap-4 xl:grid-cols-[1.2fr_1.2fr_1fr_auto_auto_1fr]">
            <div className="relative">
              <label className="mb-2 block text-sm font-bold uppercase tracking-[0.25em] text-slate-400">Leaving From</label>
              <div className="relative rounded-[1.6rem] border border-slate-200 bg-slate-50 px-5 py-4 shadow-sm transition focus-within:border-[#df6b57] focus-within:bg-white">
                <input
                  type="text"
                  placeholder="Enter source city"
                  value={from}
                  onFocus={() => setActiveField('from')}
                  onBlur={() => setTimeout(() => setActiveField(''), 120)}
                  onChange={(e) => {
                    setFrom(e.target.value);
                    setFromSuggestions([]);
                    setToSuggestions([]);
                    setSearchError('');
                  }}
                  className="w-full bg-transparent text-lg font-semibold text-slate-800 outline-none placeholder:text-slate-400"
                />
                {isFetchingFrom ? (
                  <span className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 rounded-full border-2 border-slate-300 border-t-[#df6b57] animate-spin" />
                ) : null}
              </div>
              {renderSuggestionPanel('from')}
            </div>

            <div className="relative">
              <label className="mb-2 block text-sm font-bold uppercase tracking-[0.25em] text-slate-400">Going To</label>
              <div className="relative rounded-[1.6rem] border border-slate-200 bg-slate-50 px-5 py-4 shadow-sm transition focus-within:border-[#df6b57] focus-within:bg-white">
                <input
                  type="text"
                  placeholder={from ? 'Choose destination city' : 'Select source first'}
                  value={to}
                  disabled={!from}
                  onFocus={() => setActiveField('to')}
                  onBlur={() => setTimeout(() => setActiveField(''), 120)}
                  onChange={(e) => {
                    setTo(e.target.value);
                    setToSuggestions([]);
                    setSearchError('');
                  }}
                  className="w-full bg-transparent text-lg font-semibold text-slate-800 outline-none placeholder:text-slate-400 disabled:cursor-not-allowed disabled:text-slate-400"
                />
                {isFetchingTo ? (
                  <span className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 rounded-full border-2 border-slate-300 border-t-[#df6b57] animate-spin" />
                ) : null}
              </div>
              {renderSuggestionPanel('to')}
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold uppercase tracking-[0.25em] text-slate-400">Departure</label>
              <div className="rounded-[1.6rem] border border-slate-200 bg-slate-50 px-5 py-4 shadow-sm">
                <div className="text-xs font-bold uppercase tracking-[0.25em] text-slate-400">{dateLabel}</div>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => {
                    setDate(e.target.value);
                    setSearchError('');
                  }}
                  min={minDateValue}
                  max={maxDateValue}
                  className="mt-1 w-full bg-transparent text-lg font-semibold text-slate-800 outline-none"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={() => setDate(minDateValue)}
              className={`rounded-[1.6rem] px-6 py-4 text-lg font-bold transition ${
                date === minDateValue ? 'bg-[#ffe9de] text-[#b3261e]' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Today
            </button>

            <button
              type="button"
              onClick={() => setDate(tomorrowValue)}
              className={`rounded-[1.6rem] px-6 py-4 text-lg font-bold transition ${
                date === tomorrowValue ? 'bg-[#ffe9de] text-[#b3261e]' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Tomorrow
            </button>

            <button
              type="button"
              onClick={handleSearch}
              className="rounded-[1.6rem] bg-[#df6b57] px-8 py-4 text-xl font-extrabold text-white shadow-lg shadow-[#df6b57]/30 transition hover:bg-[#c75845]"
            >
              Search Buses
            </button>
          </div>

          {searchError ? (
            <p className="mt-4 rounded-2xl border border-red-100 bg-red-50 px-5 py-3 text-sm font-bold text-red-700">
              {searchError}
            </p>
          ) : null}

          <div className="mt-5 flex flex-wrap gap-3 text-sm font-semibold text-slate-500">
            <span className="rounded-full bg-slate-100 px-4 py-2">Bus-only search</span>
            <span className="rounded-full bg-slate-100 px-4 py-2">City suggestions from dataset</span>
            <span className="rounded-full bg-slate-100 px-4 py-2">Auto routes when data is missing</span>
          </div>
        </section>

        <section className="mt-12 rounded-[2rem] border border-sky-100 bg-sky-50/70 px-5 py-8 shadow-lg shadow-sky-100/60 backdrop-blur md:px-7">
          <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
            <div>
              <h2 className="text-3xl font-extrabold tracking-wide text-slate-950">Online Bus Booking Services</h2>
              <div className="mt-7 space-y-4 text-lg font-semibold leading-8 text-slate-600">
                <p className="rounded-[1.8rem] border border-sky-100 bg-white/65 p-5 shadow-sm shadow-sky-100/60 backdrop-blur">
                  Booking Is Easier helps travellers find budget friendly bus tickets, compare schedules, and save with offers across popular routes.
                </p>
                <p className="rounded-[1.8rem] border border-sky-100 bg-white/65 p-5 shadow-sm shadow-sky-100/60 backdrop-blur">
                  Plan your journey with route suggestions, date-aware search, available seats, and quick booking from one place.
                </p>
                <p className="rounded-[1.8rem] border border-sky-100 bg-white/65 p-5 shadow-sm shadow-sky-100/60 backdrop-blur">
                  Browse bus route options and use smart filters to choose a reliable and comfortable trip for your travel plans.
                </p>
              </div>
            </div>

            <div className="relative min-h-[320px] overflow-hidden rounded-[1.8rem] border border-sky-100 bg-white/55 shadow-sm shadow-sky-100/60 backdrop-blur">
              <img
                src={busBookingIllustration}
                alt="Bus travel booking"
                className="h-full min-h-[320px] w-full rounded-[1.8rem] object-contain bg-[#fbfdff] p-4"
              />
            </div>
          </div>
        </section>

        <section className="mt-8 rounded-[2rem] border border-sky-100 bg-sky-50/70 px-5 py-8 shadow-lg shadow-sky-100/60 backdrop-blur md:px-7">
          <h2 className="text-3xl font-extrabold tracking-wide text-slate-950">Online Bus Ticket Booking at Lowest Price</h2>
          <div className="mt-6 rounded-[1.8rem] border border-sky-100 bg-white/65 p-5 shadow-sm shadow-sky-100/60 backdrop-blur">
            <p className="text-lg font-semibold leading-8 text-slate-600">
              Travellers can book bus tickets online at low fares and choose from private buses and state transport buses for routes across India.
            </p>
            <p className="mt-4 text-lg font-semibold leading-8 text-slate-600">
              Below are popular bus types available for online bus ticket booking:
            </p>
          </div>

          <div className="mt-8 grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
            <img
              src={busPaymentIllustration}
              alt="Online bus ticket payment"
              className="h-80 w-full rounded-[1.8rem] bg-[#fbfdff] object-contain p-4"
            />
            <div>
              <div className="grid rounded-lg border border-sky-100 bg-white/65 p-5 gap-x-8 gap-y-3 text-lg font-semibold text-slate-600 shadow-sm shadow-sky-100/60 backdrop-blur sm:grid-cols-2 xl:grid-cols-3">
                {busTypes.map((type) => (
                  <div key={type} className="flex gap-3">
                    <span>•</span>
                    <span>{type}</span>
                  </div>
                ))}
              </div>
              <div className="mt-6 rounded-lg border border-sky-100 bg-white/65 p-5 shadow-sm shadow-sky-100/60 backdrop-blur">
                <p className="text-lg font-semibold leading-8 text-slate-600">
                  Bus fares depend on route distance, operator, bus type, amenities, and seasonal demand. Travelling by bus remains a convenient and cost-effective option for many journeys.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-8 rounded-[2rem] border border-sky-100 bg-sky-50/70 px-5 py-8 shadow-lg shadow-sky-100/60 backdrop-blur md:px-7">
          <h2 className="text-3xl font-extrabold tracking-wide text-slate-950">Benefits of Booking Bus Tickets Online</h2>
          <div className="mt-6 rounded-[1.8rem] border border-sky-100 bg-white/65 p-5 shadow-sm shadow-sky-100/60 backdrop-blur">
            <p className="text-lg font-semibold leading-8 text-slate-600">
              Online ticket booking is easy, fast, and hassle-free. Search routes, compare options, and complete your booking without visiting offline counters.
            </p>
          </div>
          <div className="mt-8 grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <ul className="space-y-3 rounded-lg border border-sky-100 bg-white/65 p-5 text-lg font-semibold leading-8 text-slate-600 shadow-sm shadow-sky-100/60 backdrop-blur">
              {benefits.map((benefit) => (
                <li key={benefit}>• {benefit}</li>
              ))}
            </ul>
            <img
              src={busStopIllustration}
              alt="Online bus booking benefits"
              className="h-80 w-full rounded-[1.8rem] bg-[#fbfdff] object-contain p-4"
            />
          </div>
        </section>

      </main>

      {authModalMode ? (
        <AuthModal
          mode={authModalMode}
          onClose={() => {
            setAuthModalMode(null);
            setSearchParams({}, { replace: true });
          }}
          onModeChange={(mode) => {
            setAuthModalMode(mode);
            setSearchParams({ auth: mode }, { replace: true });
          }}
          onAuthSuccess={(user, token) => {
            login(user, token);
            setAuthModalMode(null);
            setSearchParams({}, { replace: true });
          }}
        />
      ) : null}
      {showTrackTicket ? (
        <TrackTicketModal
          onClose={() => setShowTrackTicket(false)}
          onTrack={handleTrackTicket}
        />
      ) : null}
    </div>
  );
};

export default Home;
