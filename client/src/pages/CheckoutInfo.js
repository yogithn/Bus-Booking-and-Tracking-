import React, { useContext, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import AuthContext from '../context/AuthContext';
import { formatDate, formatDuration, formatTime } from '../utils/dateTime';

const getStoredCheckoutInfo = () => {
  try {
    return JSON.parse(localStorage.getItem('checkoutInfo')) || {};
  } catch (error) {
    return {};
  }
};

const getStoredTravellers = () => {
  try {
    return JSON.parse(localStorage.getItem('travellers')) || [];
  } catch (error) {
    return [];
  }
};

const CheckoutInfo = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user: authUser } = useContext(AuthContext);
  const booking = location.state?.booking;
  const bus = location.state?.bus;
  const savedCheckoutInfo = useMemo(getStoredCheckoutInfo, []);
  const savedTravellers = useMemo(getStoredTravellers, []);
  const seatNumbers = useMemo(() => booking?.seats || booking?.booking?.seats || [], [booking]);
  const [contactName, setContactName] = useState(savedCheckoutInfo.contactName || authUser?.name || '');
  const [contactPhone, setContactPhone] = useState(savedCheckoutInfo.contactPhone || authUser?.phone || '');
  const [contactEmail, setContactEmail] = useState(savedCheckoutInfo.contactEmail || authUser?.email || '');
  const [billingAddress, setBillingAddress] = useState(savedCheckoutInfo.billingAddress || '');
  const [passengers, setPassengers] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!booking || !bus || passengers.length) return;

    const nextPassengers = seatNumbers.map((seat, index) => ({
      seat,
      name: savedTravellers[index]?.name || '',
      age: savedTravellers[index]?.age || '',
      gender: savedTravellers[index]?.gender || 'Male'
    }));

    setPassengers(nextPassengers);
  }, [booking, bus, seatNumbers, passengers.length, savedTravellers]);

  useEffect(() => {
    if (authUser?.name && !contactName) setContactName(authUser.name);
    if (authUser?.email && !contactEmail) setContactEmail(authUser.email);
    if (authUser?.phone && !contactPhone) setContactPhone(authUser.phone);
  }, [authUser, contactName, contactEmail, contactPhone]);

  useEffect(() => {
    if (!booking || !bus) {
      navigate(-1);
    }
  }, [booking, bus, navigate]);

  const totalFare = bus?.price && seatNumbers.length ? bus.price * seatNumbers.length : 0;

  const updatePassenger = (seat, field, value) => {
    setPassengers((prev) => prev.map((passenger) => (
      passenger.seat === seat ? { ...passenger, [field]: value } : passenger
    )));
  };

  const handleContinue = () => {
    if (!contactName || !contactPhone || !contactEmail || !billingAddress) {
      setError('Please fill in all contact and billing fields.');
      return;
    }

    const incompletePassenger = passengers.some((passenger) => !passenger.name || !passenger.age || !passenger.gender);
    if (incompletePassenger) {
      setError('Please complete passenger details for every selected seat.');
      return;
    }

    setError('');

    const checkoutInfo = {
      contactName,
      contactPhone,
      contactEmail,
      billingAddress
    };
    localStorage.setItem('checkoutInfo', JSON.stringify(checkoutInfo));

    navigate('/payment', {
      state: {
        booking,
        bus,
        extraInfo: {
          contactName,
          contactPhone,
          contactEmail,
          billingAddress,
          passengers
        }
      }
    });
  };

  if (!booking || !bus) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="rounded-3xl bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-bold text-slate-900 mb-4">Passenger & Billing Details</h1>
          <div className="grid gap-4 lg:grid-cols-[1.6fr_0.9fr]">
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <p className="text-sm uppercase tracking-[0.18em] text-slate-500">Trip Details</p>
              <h2 className="mt-4 text-xl font-bold text-slate-900">{bus.source || 'Unknown'} -> {bus.destination || 'Unknown'}</h2>
              <p className="mt-2 text-sm text-slate-600">{formatDate(bus.departure, 'en-IN')} • {formatTime(bus.departure, 'en-US', { hour: '2-digit', minute: '2-digit' })}</p>
              <p className="mt-1 text-sm text-slate-600">{formatDate(bus.arrival, 'en-IN')} • {formatTime(bus.arrival, 'en-US', { hour: '2-digit', minute: '2-digit' })}</p>
              <p className="mt-2 text-sm text-blue-600 font-semibold">
                Travel Time: {bus.durationDisplay || formatDuration(bus.durationMinutes)}
              </p>
              {bus.distance && <p className="mt-1 text-sm text-slate-600">Distance: {bus.distance} km</p>}
              <p className="mt-4 text-sm text-slate-700">Operator: {bus.operator || 'Unknown Operator'}</p>
              <p className="mt-1 text-sm text-slate-700">Seats: {seatNumbers.join(', ')}</p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-sm uppercase tracking-[0.18em] text-slate-500">Fare Details</p>
              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between text-sm text-slate-600">
                  <span>Seat count</span>
                  <span>{seatNumbers.length}</span>
                </div>
                <div className="flex items-center justify-between text-sm text-slate-600">
                  <span>Fare per seat</span>
                  <span>Rs.{bus.price}</span>
                </div>
                <div className="flex items-center justify-between border-t border-slate-200 pt-3 text-lg font-bold text-slate-900">
                  <span>Total</span>
                  <span>Rs.{totalFare}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
          <div className="space-y-6">
            <section className="rounded-3xl bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-slate-900">Contact Details</h2>
                <span className="text-sm text-slate-500">Required</span>
              </div>
              <div className="grid gap-4">
                <label className="block">
                  <span className="text-sm font-semibold text-slate-700">Name</span>
                  <input
                    value={contactName}
                    onChange={(event) => setContactName(event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none"
                    placeholder="Contact name"
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-semibold text-slate-700">Phone</span>
                  <input
                    value={contactPhone}
                    onChange={(event) => setContactPhone(event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none"
                    placeholder="Mobile number"
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-semibold text-slate-700">Email</span>
                  <input
                    value={contactEmail}
                    onChange={(event) => setContactEmail(event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none"
                    placeholder="Email address"
                  />
                </label>
              </div>
            </section>

            <section className="rounded-3xl bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-slate-900">Passenger Details</h2>
                <span className="text-sm text-slate-500">One entry per seat</span>
              </div>
              <div className="space-y-4">
                {passengers.map((passenger) => (
                  <div key={passenger.seat} className="rounded-3xl border border-slate-200 p-4">
                    <div className="mb-3 flex items-center justify-between text-sm font-semibold text-slate-700">
                      <span>Seat {passenger.seat}</span>
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-600">{bus.busType || 'Standard'}</span>
                    </div>
                    <div className="grid gap-4 md:grid-cols-[1fr_120px_120px]">
                      <label className="block">
                        <span className="text-sm text-slate-600">Name</span>
                        <input
                          value={passenger.name}
                          onChange={(event) => updatePassenger(passenger.seat, 'name', event.target.value)}
                          className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none"
                          placeholder="Passenger name"
                        />
                      </label>
                      <label className="block">
                        <span className="text-sm text-slate-600">Age</span>
                        <input
                          value={passenger.age}
                          onChange={(event) => updatePassenger(passenger.seat, 'age', event.target.value)}
                          className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none"
                          placeholder="Age"
                        />
                      </label>
                      <label className="block">
                        <span className="text-sm text-slate-600">Gender</span>
                        <select
                          value={passenger.gender}
                          onChange={(event) => updatePassenger(passenger.seat, 'gender', event.target.value)}
                          className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none"
                        >
                          <option>Male</option>
                          <option>Female</option>
                          <option>Other</option>
                        </select>
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <div className="space-y-6">
            <section className="rounded-3xl bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-slate-900">Billing Address</h2>
                <span className="text-sm text-slate-500">GST invoice ready</span>
              </div>
              <label className="block">
                <textarea
                  value={billingAddress}
                  onChange={(event) => setBillingAddress(event.target.value)}
                  className="mt-2 h-40 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-700 outline-none resize-none"
                  placeholder="Enter billing address for GST invoice"
                />
              </label>
            </section>

            {error ? <p className="text-sm font-medium text-red-600">{error}</p> : null}

            <button
              type="button"
              onClick={handleContinue}
              className="w-full rounded-3xl bg-[#dc5f59] px-5 py-4 text-center text-sm font-bold text-white transition hover:bg-[#bd4c4a]"
            >
              Continue to Payment
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckoutInfo;
