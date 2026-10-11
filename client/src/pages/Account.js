import React, { useContext, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import AuthContext from '../context/AuthContext';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const getStoredTravellers = () => {
  try {
    return JSON.parse(localStorage.getItem('travellers')) || [];
  } catch (error) {
    return [];
  }
};

const menuItems = [
  { id: 'bookings', label: 'My Bookings', icon: 'T' },
  { id: 'travellers', label: 'My Travellers List', icon: 'P' },
  { id: 'profile', label: 'Profile', icon: 'U' },
  { id: 'billing', label: 'Billing Address', icon: 'A' },
  { id: 'notification', label: 'Notification', icon: 'N' }
];

const bookingFilters = ['Upcoming', 'Past', 'Cancelled', 'Unsuccessful'];

const getBookingStatus = (booking) => String(booking?.status || '').toLowerCase();

const getBookingTripDate = (booking) => {
  const dateValue = booking?.bus?.arrival || booking?.bus?.departure || booking?.createdAt;
  const date = dateValue ? new Date(dateValue) : null;
  return date && !Number.isNaN(date.getTime()) ? date : null;
};

const matchesBookingFilter = (booking, filter) => {
  const status = getBookingStatus(booking);
  const tripDate = getBookingTripDate(booking);
  const isPastTrip = tripDate ? tripDate < new Date() : false;

  if (filter === 'Cancelled') {
    return status === 'cancelled';
  }

  if (filter === 'Unsuccessful') {
    return ['failed', 'failure', 'unsuccessful', 'payment_failed'].includes(status);
  }

  if (filter === 'Past') {
    return status !== 'cancelled' && !matchesBookingFilter(booking, 'Unsuccessful') && isPastTrip;
  }

  return status !== 'cancelled' && !matchesBookingFilter(booking, 'Unsuccessful') && !isPastTrip;
};

const HeaderAccountMenu = ({ userName, onNavigate, onLogout }) => {
  const [isOpen, setIsOpen] = useState(false);
  const displayName = userName || 'My Account';
  const initial = displayName.charAt(0).toUpperCase();

  const accountOptions = [
    { id: 'profile', title: displayName, subtitle: 'My Profile', icon: initial },
    { id: 'bookings', title: 'My Bookings', subtitle: 'View & Manage bookings', icon: 'T' },
    { id: 'travellers', title: 'My Travellers', subtitle: 'View all saved travellers', icon: 'P' },
    { id: 'billing', title: 'Billing Address', subtitle: 'Manage saved billing details', icon: 'A' },
    { id: 'notification', title: 'Notification', subtitle: 'View account alerts', icon: 'N' }
  ];

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className="flex max-w-52 items-center gap-2 rounded-lg px-3 py-2 text-[#dc5f59] hover:bg-slate-50"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#dc5f59] text-xs font-extrabold text-white">
          {initial}
        </span>
        <span className="truncate font-bold">{displayName}</span>
      </button>

      {isOpen ? (
        <div className="absolute right-0 top-[calc(100%+0.7rem)] z-40 w-72 rounded-lg bg-white p-4 text-left shadow-2xl">
          {accountOptions.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => {
                onNavigate(option.id);
                setIsOpen(false);
              }}
              className="flex w-full items-start gap-3 rounded-lg px-2 py-3 text-left hover:bg-slate-50"
            >
              <span className="mt-1 flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-xs font-extrabold text-slate-500">
                {option.icon}
              </span>
              <span>
                <span className="block text-base font-extrabold text-slate-900">{option.title}</span>
                <span className="mt-1 block text-sm font-semibold text-slate-500">{option.subtitle}</span>
              </span>
            </button>
          ))}

          <button
            type="button"
            onClick={onLogout}
            className="mt-2 flex w-full items-center gap-3 rounded-lg px-2 py-3 text-left text-base font-extrabold text-slate-900 hover:bg-slate-50"
          >
            <span className="text-lg text-slate-400">{'>'}</span>
            Log out
          </button>
        </div>
      ) : null}
    </div>
  );
};

const Account = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedTab = searchParams.get('tab') || 'profile';
  const activeTab = menuItems.some((item) => item.id === requestedTab) ? requestedTab : 'profile';
  const { user: storedUser, token, isLoggedIn, logout, login } = useContext(AuthContext);
  const [profile, setProfile] = useState({
    name: storedUser?.name || '',
    email: storedUser?.email || '',
    gender: '',
    phone: '',
    dob: ''
  });
  const [bookings, setBookings] = useState([]);
  const [localBookings, setLocalBookings] = useState([]);
  const [bookingError, setBookingError] = useState('');
  const [bookingLoading, setBookingLoading] = useState(activeTab === 'bookings');
  const [bookingFilter, setBookingFilter] = useState('Upcoming');
  const [deletingBookingId, setDeletingBookingId] = useState(null);
  const [bookingMessage, setBookingMessage] = useState('');
  const [travellers, setTravellers] = useState(() => getStoredTravellers());
  const [showTravellerForm, setShowTravellerForm] = useState(false);
  const [travellerForm, setTravellerForm] = useState({ name: '', age: '', gender: 'Male' });
  const [travellerError, setTravellerError] = useState('');
  const [editingTravellerId, setEditingTravellerId] = useState(null);
  const [travellerPopup, setTravellerPopup] = useState(null);
  const [saveMessage, setSaveMessage] = useState('');

  const getAuthToken = () => token || localStorage.getItem('token');

  const getStoredLocalBookings = () => {
    try {
      return JSON.parse(localStorage.getItem('localBookings')) || [];
    } catch (error) {
      return [];
    }
  };

  const removeStoredLocalBooking = (bookingId) => {
    try {
      const current = getStoredLocalBookings();
      const next = current.filter((booking) => booking._id !== bookingId);
      localStorage.setItem('localBookings', JSON.stringify(next));
      return next;
    } catch (error) {
      return [];
    }
  };

  const combinedBookings = useMemo(
    () => [...localBookings, ...bookings],
    [localBookings, bookings]
  );

  const filteredBookings = useMemo(
    () => combinedBookings.filter((booking) => matchesBookingFilter(booking, bookingFilter)),
    [combinedBookings, bookingFilter]
  );

  useEffect(() => {
    setProfile({
      name: storedUser?.name || '',
      email: storedUser?.email || '',
      gender: '',
      phone: '',
      dob: ''
    });
  }, [storedUser]);

  useEffect(() => {
    if (activeTab !== 'bookings') {
      return;
    }

    setLocalBookings(getStoredLocalBookings());

    if (!isLoggedIn) {
      setBookingLoading(false);
      return;
    }

    const fetchBookings = async () => {
      setBookingLoading(true);
      setBookingError('');

      const authToken = getAuthToken();
      if (!authToken) {
        setBookingError('Your session is not active. Please sign in again.');
        setBookingLoading(false);
        return;
      }

      try {
        const response = await axios.get(`${API_BASE_URL}/bookings`, {
          headers: { Authorization: `Bearer ${authToken}` }
        });
        setBookings(response.data);
      } catch (error) {
        if (error?.response?.status === 401) {
          setBookingError('Your session expired or is invalid. Please log in again.');
        } else if (error?.response?.data?.message) {
          setBookingError(error.response.data.message);
        } else {
          setBookingError('Unable to load your bookings right now.');
        }
      } finally {
        setBookingLoading(false);
      }
    };

    fetchBookings();
  }, [activeTab, isLoggedIn, token]);

  useEffect(() => {
    if (activeTab === 'travellers' && travellers.length === 0 && !showTravellerForm) {
      setTravellerPopup({
        tone: 'empty',
        title: 'Saved Passengers',
        message: 'No Saved Passengers Found!'
      });
    }
  }, [activeTab, showTravellerForm, travellers.length]);

  const handleTabChange = (tab) => {
    setSearchParams({ tab });
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleProfileSave = (event) => {
    event.preventDefault();
    const updatedUser = {
      ...storedUser,
      name: profile.name,
      email: profile.email
    };

    localStorage.setItem('user', JSON.stringify(updatedUser));
    login(updatedUser, token);
    setSaveMessage('Profile saved.');
  };

  const handleSaveTraveller = (event) => {
    event.preventDefault();
    setTravellerError('');

    if (!travellerForm.name.trim() || !travellerForm.age.trim()) {
      setTravellerError('Please enter passenger name and age.');
      return;
    }

    const passenger = {
      id: editingTravellerId || Date.now().toString(),
      name: travellerForm.name.trim(),
      age: travellerForm.age.trim(),
      gender: travellerForm.gender
    };
    const nextTravellers = editingTravellerId
      ? travellers.map((traveller) => (traveller.id === editingTravellerId ? passenger : traveller))
      : [
        ...travellers,
        {
        id: Date.now().toString(),
        name: travellerForm.name.trim(),
        age: travellerForm.age.trim(),
        gender: travellerForm.gender
      }
      ];

    setTravellers(nextTravellers);
    localStorage.setItem('travellers', JSON.stringify(nextTravellers));
    setTravellerForm({ name: '', age: '', gender: 'Male' });
    setEditingTravellerId(null);
    setTravellerPopup({
      tone: 'success',
      title: 'Saved Passengers',
      message: editingTravellerId ? 'Traveller updated successfully!' : 'Traveller added successfully!'
    });
    setShowTravellerForm(false);
  };

  const handleEditTraveller = (traveller) => {
    setTravellerForm({
      name: traveller.name,
      age: traveller.age,
      gender: traveller.gender
    });
    setEditingTravellerId(traveller.id);
    setTravellerError('');
    setShowTravellerForm(true);
  };

  const handleDeleteTraveller = (travellerId) => {
    const nextTravellers = travellers.filter((traveller) => traveller.id !== travellerId);
    setTravellers(nextTravellers);
    localStorage.setItem('travellers', JSON.stringify(nextTravellers));
    setTravellerPopup({
      tone: nextTravellers.length === 0 ? 'empty' : 'success',
      title: 'Saved Passengers',
      message: nextTravellers.length === 0 ? 'No Saved Passengers Found!' : 'Traveller deleted successfully!'
    });
  };

  const handleDeleteBooking = async (bookingId) => {
    const shouldDelete = window.confirm('Delete this booking? This action cannot be undone.');
    if (!shouldDelete) {
      return;
    }

    setDeletingBookingId(bookingId);
    setBookingError('');
    setBookingMessage('');

    try {
      const authToken = getAuthToken();
      if (!authToken) {
        setBookingError('Your session is not active. Please sign in again.');
        return;
      }

      if (bookingId?.startsWith('local-')) {
        const updatedLocalBookings = removeStoredLocalBooking(bookingId);
        setLocalBookings(updatedLocalBookings);
        setBookingMessage('Booking deleted successfully.');
        return;
      }

      await axios.delete(`${API_BASE_URL}/bookings/${bookingId}`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      setBookings((current) => current.filter((booking) => booking._id !== bookingId));
      setBookingMessage('Booking deleted successfully.');
    } catch (error) {
      if (error?.response?.status === 401) {
        setBookingError('Your session expired or is invalid. Please log in again.');
      } else {
        setBookingError(error.response?.data?.message || 'Unable to delete this booking right now.');
      }
    } finally {
      setDeletingBookingId(null);
    }
  };

  const handleOpenTravellerForm = () => {
    setTravellerForm({ name: '', age: '', gender: 'Male' });
    setEditingTravellerId(null);
    setTravellerError('');
    setShowTravellerForm(true);
  };

  const renderProfile = () => (
    <form onSubmit={handleProfileSave} className="rounded-lg bg-white px-6 py-5">
      <h1 className="text-2xl font-extrabold text-slate-950">Profile Info</h1>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <label className="block">
          <span className="mb-2 block text-base font-extrabold text-slate-950">Name</span>
          <input
            type="text"
            value={profile.name}
            onChange={(event) => setProfile((current) => ({ ...current, name: event.target.value }))}
            className="w-full rounded-lg border border-slate-300 px-4 py-3 text-base font-semibold outline-none focus:border-[#dc5f59]"
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-base font-extrabold text-slate-950">Email</span>
          <input
            type="email"
            value={profile.email}
            onChange={(event) => setProfile((current) => ({ ...current, email: event.target.value }))}
            className="w-full rounded-lg border border-slate-300 px-4 py-3 text-base font-semibold outline-none focus:border-[#dc5f59]"
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-base font-extrabold text-slate-950">Gender</span>
          <select
            value={profile.gender}
            onChange={(event) => setProfile((current) => ({ ...current, gender: event.target.value }))}
            className="w-full rounded-lg border border-slate-300 px-4 py-3 text-base font-semibold outline-none focus:border-[#dc5f59]"
          >
            <option value="">Select gender</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
          </select>
        </label>

        <label className="block">
          <span className="mb-2 block text-base font-extrabold text-slate-950">Mobile Number</span>
          <input
            type="tel"
            value={profile.phone}
            onChange={(event) => setProfile((current) => ({ ...current, phone: event.target.value }))}
            placeholder="+91"
            className="w-full rounded-lg border border-slate-300 px-4 py-3 text-base font-semibold outline-none focus:border-[#dc5f59]"
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-base font-extrabold text-slate-950">DOB</span>
          <input
            type="date"
            value={profile.dob}
            onChange={(event) => setProfile((current) => ({ ...current, dob: event.target.value }))}
            className="w-full rounded-lg border border-slate-300 px-4 py-3 text-base font-semibold outline-none focus:border-[#dc5f59]"
          />
        </label>
      </div>

      <button type="submit" className="mt-7 w-48 rounded-lg bg-[#dc5f59] px-6 py-3 text-base font-bold text-white">
        Save
      </button>
      {saveMessage ? <p className="mt-4 text-base font-semibold text-green-700">{saveMessage}</p> : null}
    </form>
  );

  const renderBookings = () => (
    <section className="rounded-lg bg-white px-6 py-5">
      <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 xl:flex-row xl:items-center xl:justify-between">
        <h1 className="text-2xl font-extrabold text-slate-950">Bus Bookings</h1>
        <div className="flex flex-wrap gap-2">
          {bookingFilters.map((filter) => (
            <button
              key={filter}
              type="button"
              onClick={() => setBookingFilter(filter)}
              className={`rounded-full border px-5 py-2 text-sm font-semibold transition ${
                bookingFilter === filter
                  ? 'border-[#e15f5a] bg-[#fff2f2] text-[#d7302b]'
                  : 'border-slate-400 bg-white text-slate-600 hover:border-[#e15f5a] hover:text-[#d7302b]'
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      {bookingLoading ? <p className="mt-6 text-lg font-semibold text-slate-500">Loading bookings...</p> : null}
      {bookingError ? <p className="mt-6 text-lg font-semibold text-red-600">{bookingError}</p> : null}
      {bookingMessage ? <p className="mt-6 text-lg font-semibold text-green-700">{bookingMessage}</p> : null}
      {!bookingLoading && !bookingError && bookings.length === 0 ? (
        <div className="mt-7 rounded-lg border border-[#ff8c8c] bg-[#fff4f4] px-4 py-3 text-base font-semibold text-[#d7302b]">
          You have no bookings yet
        </div>
      ) : null}
      {!bookingLoading && !bookingError && bookings.length > 0 && filteredBookings.length === 0 ? (
        <div className="mt-7 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-base font-semibold text-slate-600">
          No {bookingFilter.toLowerCase()} bookings found.
        </div>
      ) : null}
      <div className="mt-6 space-y-4">
        {filteredBookings.map((booking) => (
          <article key={booking._id} className="rounded-lg border border-slate-200 p-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-lg font-extrabold text-slate-950">{booking.bus?.route || 'Bus booking'}</h2>
                <p className="mt-2 text-sm font-semibold text-slate-600">Seats: {booking.seats?.join(', ') || 'Not selected'}</p>
                <p className="text-sm font-semibold text-slate-600">Status: {booking.status || 'Pending'}</p>
              </div>
              <button
                type="button"
                onClick={() => handleDeleteBooking(booking._id)}
                disabled={deletingBookingId === booking._id}
                className="self-start rounded-lg border border-red-500 px-4 py-2 text-sm font-bold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:border-slate-300 disabled:text-slate-400"
              >
                {deletingBookingId === booking._id ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );

  const renderPlaceholder = (title, body) => (
    <section className="rounded-lg bg-white px-6 py-5">
      <h1 className="text-2xl font-extrabold text-slate-950">{title}</h1>
      <p className="mt-5 max-w-2xl text-base font-semibold leading-7 text-slate-500">{body}</p>
    </section>
  );

  const renderTravellers = () => (
    <section className="rounded-lg bg-white px-6 py-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-extrabold text-slate-950">Saved Passengers</h1>
        {travellers.length > 0 ? (
          <p className="text-base font-semibold text-slate-950">You have {travellers.length} Traveller(s)</p>
        ) : null}
        <button
          type="button"
          onClick={handleOpenTravellerForm}
          className="inline-flex items-center gap-3 self-start rounded-lg px-3 py-2 text-base font-semibold text-[#dc5f59] hover:bg-red-50 sm:self-auto"
        >
          <span className="text-xl leading-none text-blue-700">+</span>
          Add New Traveller
        </button>
      </div>

      {travellers.length === 0 ? (
        <div className="mt-8 flex items-center justify-between rounded-lg bg-[#fff4f4] px-5 py-4 text-base font-semibold text-[#d7302b]">
          <span>No Saved Passengers Found!</span>
          <button type="button" aria-label="Dismiss saved passengers message" className="text-lg leading-none text-slate-700">
            &times;
          </button>
        </div>
      ) : (
        <div className="mt-7 overflow-x-auto">
          <table className="w-full min-w-[720px] text-left">
            <thead className="bg-slate-100 text-lg font-extrabold text-slate-950">
              <tr>
                <th className="px-5 py-4">Name</th>
                <th className="px-5 py-4">Age</th>
                <th className="px-5 py-4">Gender</th>
                <th className="px-5 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white text-base font-semibold text-slate-600">
              {travellers.map((traveller) => (
                <tr key={traveller.id} className="border-b border-slate-100">
                  <td className="px-5 py-4">{traveller.name}</td>
                  <td className="px-5 py-4">{traveller.age}</td>
                  <td className="px-5 py-4">{traveller.gender}</td>
                  <td className="px-5 py-4">
                    <div className="flex justify-end gap-3">
                      <button
                        type="button"
                        onClick={() => handleEditTraveller(traveller)}
                        className="rounded-lg border border-blue-600 px-4 py-2 text-sm font-bold text-blue-600 hover:bg-blue-50"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteTraveller(traveller.id)}
                        className="rounded-lg border border-red-500 px-4 py-2 text-sm font-bold text-red-600 hover:bg-red-50"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );

  const travellerDrawer = showTravellerForm ? (
    <div className="fixed inset-0 z-50 bg-slate-900/45">
      <aside className="ml-auto min-h-full w-full max-w-[700px] rounded-l-lg bg-white px-7 py-6 shadow-2xl">
        <div className="flex items-center gap-5">
          <button
            type="button"
            onClick={() => {
              setShowTravellerForm(false);
              setEditingTravellerId(null);
            }}
            aria-label="Close add traveller form"
            className="text-3xl leading-none text-slate-900"
          >
            &lt;
          </button>
          <h2 className="text-2xl font-extrabold text-slate-900">{editingTravellerId ? 'Edit Traveller' : 'Add New Traveller'}</h2>
        </div>

        <form onSubmit={handleSaveTraveller} className="mt-10">
          <label className="block">
            <span className="mb-2 block text-lg font-bold text-slate-500">Name</span>
            <input
              type="text"
              value={travellerForm.name}
              onChange={(event) => setTravellerForm((current) => ({ ...current, name: event.target.value }))}
              placeholder="Enter Your Name"
              className="w-full rounded-lg border border-slate-300 px-4 py-3 text-lg font-semibold outline-none focus:border-[#dc5f59]"
            />
          </label>

          <label className="mt-6 block">
            <span className="mb-2 block text-lg font-bold text-slate-500">Age</span>
            <input
              type="number"
              min="1"
              value={travellerForm.age}
              onChange={(event) => setTravellerForm((current) => ({ ...current, age: event.target.value }))}
              placeholder="Enter Your Age"
              className="w-full rounded-lg border border-slate-300 px-4 py-3 text-lg font-semibold outline-none focus:border-[#dc5f59]"
            />
          </label>

          <fieldset className="mt-6">
            <legend className="mb-3 text-base font-extrabold text-slate-500">Select the gender</legend>
            {['Male', 'Female'].map((gender) => (
              <label key={gender} className="mb-2 flex items-center gap-2 text-lg font-semibold text-slate-600">
                <input
                  type="radio"
                  name="travellerGender"
                  checked={travellerForm.gender === gender}
                  onChange={() => setTravellerForm((current) => ({ ...current, gender }))}
                  className="h-5 w-5 accent-[#dc352f]"
                />
                {gender}
              </label>
            ))}
          </fieldset>

          {travellerError ? <p className="mt-4 text-sm font-semibold text-red-600">{travellerError}</p> : null}

          <button
            type="submit"
            className="mt-8 block w-full rounded-lg bg-[#d9342e] px-8 py-4 text-lg font-extrabold text-white sm:ml-auto sm:w-64"
          >
            {editingTravellerId ? 'Update Passenger' : 'Save Passenger'}
          </button>
        </form>
      </aside>
    </div>
  ) : null;

  const travellerStatusPopup = travellerPopup ? (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/35 px-4">
      <div className="w-full max-w-md rounded-lg bg-white p-6 text-center shadow-2xl">
        <h2 className="text-2xl font-extrabold text-slate-950">{travellerPopup.title}</h2>
        <p className={`mt-4 text-lg font-semibold ${
          travellerPopup.tone === 'success' ? 'text-green-700' : 'text-[#d7302b]'
        }`}>
          {travellerPopup.message}
        </p>
        <button
          type="button"
          onClick={() => setTravellerPopup(null)}
          className="mt-6 rounded-lg bg-[#d9342e] px-8 py-3 text-base font-extrabold text-white"
        >
          OK
        </button>
      </div>
    </div>
  ) : null;

  const renderNotLoggedIn = () => (
    <div className="rounded-lg bg-white/70 p-8 text-center shadow-sm">
      <h2 className="text-2xl font-extrabold text-slate-950">Please sign in first</h2>
      <p className="mt-4 text-slate-600">You need to sign in from the home page before accessing account details or viewing bookings.</p>
      <button
        type="button"
        onClick={() => navigate('/')}
        className="mt-6 rounded-2xl bg-[#df6b57] px-6 py-3 text-white font-bold transition hover:bg-[#c75845]"
      >
        Go to Home
      </button>
    </div>
  );

  const content = {
    profile: renderProfile(),
    bookings: renderBookings(),
    travellers: renderTravellers(),
    billing: renderPlaceholder('Billing Address', 'Add billing details here to make future payments faster.'),
    notification: renderPlaceholder('Notification', 'Booking alerts, route updates, and account messages will appear here.')
  };

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="mx-auto grid max-w-[1800px] gap-5 px-5 py-5 lg:grid-cols-[260px_1fr]">
        <aside className="h-fit rounded-lg bg-white py-3">
          {menuItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => handleTabChange(item.id)}
              className={`flex w-full items-center gap-3 px-5 py-3 text-left text-base font-semibold transition ${
                activeTab === item.id ? 'bg-[#d7302b] text-white' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <span className={`flex h-6 w-6 items-center justify-center rounded text-xs font-extrabold ${
                activeTab === item.id ? 'bg-white/20 text-white' : 'bg-slate-100 text-[#d7302b]'
              }`}>
                {item.icon}
              </span>
              {item.label}
            </button>
          ))}
        </aside>

        <main className="min-h-[560px] rounded-lg bg-white/70 p-5">
          {isLoggedIn ? content[activeTab] : renderNotLoggedIn()}
        </main>
      </div>
      {travellerDrawer}
      {travellerStatusPopup}
    </div>
  );
};

export default Account;
