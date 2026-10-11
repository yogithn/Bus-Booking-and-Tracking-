import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { formatDateTime } from '../utils/dateTime';

const Payment = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const booking = location.state?.booking;
  const bus = location.state?.bus;
  const extraInfo = location.state?.extraInfo;
  const seatList = booking?.seats || booking?.booking?.seats || [];
  const fare = bus?.price && seatList.length ? bus.price * seatList.length : 0;
  const cancellationCharge = Math.max(0, Math.round(fare * 0.095));
  const amountPayable = fare + cancellationCharge;

  const handleProceed = () => {
    if (!booking) {
      navigate('/');
      return;
    }

    const bookingBus = booking?.booking?.bus || booking?.bus;
    const trackingBusId = typeof bookingBus === 'object'
      ? bookingBus?._id
      : bookingBus || bus?._id;

    if (!trackingBusId) {
      navigate('/');
      return;
    }

    navigate(`/tracking/${encodeURIComponent(trackingBusId)}`, { state: { bus } });
  };

  const methodItems = [
    { title: 'Mock UPI payment', subtitle: 'Demo payment succeeds instantly', icon: 'UPI' },
    { title: 'Mock card payment', subtitle: 'No real card is charged', icon: 'CARD' },
    { title: 'Mock wallet', subtitle: 'Simulated wallet confirmation', icon: 'WALLET' },
    { title: 'Mock net banking', subtitle: 'Demo bank approval flow', icon: 'BANK' },
    { title: 'Mock EMI', subtitle: 'Simulated EMI option', icon: 'EMI' }
  ];

  return (
    <div className="min-h-screen bg-slate-50 p-6 sm:p-8">
      <div className="mx-auto max-w-[1400px] space-y-6">
        <div className="grid gap-6 xl:grid-cols-[370px_minmax(0,1fr)]">
          <div className="rounded-[32px] bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Fare Summary</h1>
                <p className="mt-2 text-sm text-slate-500">Review charges before mock payment</p>
              </div>
              <span className="inline-flex items-center rounded-3xl bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700">{seatList.length} Seat{seatList.length !== 1 ? 's' : ''}</span>
            </div>

            <div className="mt-8 space-y-4 rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <div className="flex items-center justify-between text-sm text-slate-600">
                <span>Total Fare</span>
                <span className="text-slate-900 font-semibold">₹{fare}</span>
              </div>
              <div className="flex items-center justify-between text-sm text-slate-600">
                <span>Free Cancellation Charge</span>
                <span className="text-slate-900 font-semibold">₹{cancellationCharge}</span>
              </div>
              <div className="border-t border-slate-200 pt-4 flex items-center justify-between text-lg font-bold text-slate-900">
                <span>Amount To Be Paid</span>
                <span>₹{amountPayable}</span>
              </div>
            </div>

            <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-5">
              <h2 className="text-xl font-bold text-slate-900">Booking overview</h2>
              <div className="mt-4 space-y-3 text-sm text-slate-600">
                <p><span className="font-semibold text-slate-900">Route:</span> {bus?.source || 'Unknown'} → {bus?.destination || 'Unknown'}</p>
                <p><span className="font-semibold text-slate-900">Departure:</span> {bus ? formatDateTime(bus.departure, 'en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '-'}</p>
                <p><span className="font-semibold text-slate-900">Travellers:</span> {seatList.length ? seatList.map((seat) => `Seat ${seat}`).join(', ') : 'None'}</p>
                {extraInfo?.contactName ? <p><span className="font-semibold text-slate-900">Contact:</span> {extraInfo.contactName}</p> : null}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-[32px] bg-white p-6 shadow-sm ring-1 ring-slate-200">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Recommended</h2>
                  <p className="mt-1 text-sm text-slate-500">Demo methods only</p>
                </div>
                <span className="inline-flex items-center rounded-full bg-emerald-100 px-3 py-2 text-sm font-semibold text-emerald-700">Fast</span>
              </div>

              <div className="mt-6 space-y-4">
                {methodItems.slice(0, 2).map((item) => (
                  <div key={item.title} className="flex items-center gap-4 rounded-3xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-3xl bg-white text-xl shadow-sm">{item.icon}</div>
                    <div>
                      <h3 className="text-base font-semibold text-slate-900">{item.title}</h3>
                      <p className="text-sm text-slate-500">{item.subtitle}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[32px] bg-white p-6 shadow-sm ring-1 ring-slate-200">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Mock UPI QR</h2>
                  <p className="mt-1 text-sm text-slate-500">This is a demo QR area. No real payment is collected.</p>
                </div>
                <button type="button" className="rounded-full border border-slate-200 bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700">Generate QR</button>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-[1.5fr_1fr]">
                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                  <div className="h-56 rounded-3xl bg-white shadow-inner shadow-slate-100 flex items-center justify-center text-slate-400">
                    MOCK QR
                  </div>
                </div>
                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                  <div className="flex flex-wrap gap-2">
                    {['Paytm', 'PhonePe', 'Google Pay', 'Amazon Pay', 'UPI'].map((wallet) => (
                      <span key={wallet} className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">{wallet}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-[32px] bg-white p-6 shadow-sm ring-1 ring-slate-200">
              <h2 className="text-xl font-bold text-slate-900">Other payment options</h2>
              <div className="mt-4 space-y-3">
                {methodItems.slice(2).map((item) => (
                  <div key={item.title} className="flex items-center gap-4 rounded-3xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-3xl bg-white text-xl shadow-sm">{item.icon}</div>
                    <div>
                      <h3 className="text-base font-semibold text-slate-900">{item.title}</h3>
                      <p className="text-sm text-slate-500">{item.subtitle}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={handleProceed}
              className="w-full rounded-[32px] bg-[#dc5f59] px-6 py-4 text-center text-base font-bold text-white transition hover:bg-[#bd4c4a]"
            >
              Confirm Mock Payment ₹{amountPayable}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Payment;
