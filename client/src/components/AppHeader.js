import React, { useContext, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthContext from '../context/AuthContext';
import passengersBusLogo from '../assets/passengers-bus-logo-transparent.png';

const AppHeader = () => {
  const navigate = useNavigate();
  const { user, logout, isLoggedIn } = useContext(AuthContext);
  const displayName = user?.name ? user.name.split(' ')[0] : 'My Account';
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const accountMenuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (accountMenuRef.current && !accountMenuRef.current.contains(event.target)) {
        setIsAccountOpen(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setIsAccountOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  const initial = displayName.charAt(0).toUpperCase();
  const accountOptions = [
    { id: 'profile', title: displayName, subtitle: 'My Profile', icon: 'user' },
    { id: 'bookings', title: 'My Bookings', subtitle: 'View & manage bookings', icon: 'bag' },
    { id: 'travellers', title: 'My Travellers', subtitle: 'View all saved travellers', icon: 'people' }
  ];

  const renderIcon = (icon) => {
    const iconClass = "h-7 w-7 text-slate-400";

    if (icon === 'bag') {
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" className={iconClass} fill="currentColor">
          <path d="M8 6V5a4 4 0 0 1 8 0v1h3a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3Zm2 0h4V5a2 2 0 1 0-4 0v1Zm-5 6h14v-2H5v2Z" />
        </svg>
      );
    }

    if (icon === 'wallet') {
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" className={iconClass} fill="currentColor">
          <path d="M4 5h15a2 2 0 0 1 2 2v2h-5a4 4 0 0 0 0 8h5v2a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Zm12 6h6v4h-6a2 2 0 1 1 0-4Zm1 3h1.5v-2H17v2Z" />
        </svg>
      );
    }

    if (icon === 'people') {
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" className={iconClass} fill="currentColor">
          <path d="M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm8-1a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM9 13c-4 0-7 2-7 4.5V20h14v-2.5C16 15 13 13 9 13Zm8 0c-.7 0-1.4.1-2 .3 1.8 1 3 2.4 3 4.2V20h4v-2.3C22 14.9 19.8 13 17 13Z" />
        </svg>
      );
    }

    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className={iconClass} fill="currentColor">
        <path d="M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10Zm0 2c-4.4 0-8 2.2-8 5v1.5c0 .8.7 1.5 1.5 1.5h13c.8 0 1.5-.7 1.5-1.5V19c0-2.8-3.6-5-8-5Z" />
      </svg>
    );
  };

  const handleAccountNavigate = (tab) => {
    setIsAccountOpen(false);
    navigate(`/account?tab=${tab}`);
  };

  const handleAccountButtonClick = () => {
    setIsAccountOpen((current) => !current);
  };

  const handleLogout = () => {
    logout();
    setIsAccountOpen(false);
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-50 border-b border-[#102b38]/10 bg-[#fffaf2]/92 backdrop-blur-xl">
      <div className="mx-auto flex flex-wrap items-center justify-between gap-4 px-5 py-4 md:px-10">
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="flex items-center gap-3 text-left"
          >
            <span className="flex h-16 w-24 items-center justify-center overflow-hidden rounded-2xl border border-[#102b38]/10 bg-[#f8f1e6] p-1.5 shadow-sm">
              <img src={passengersBusLogo} alt="" className="h-full w-full object-contain" />
            </span>
            <span className="text-3xl font-extrabold tracking-tight text-[#102b38]">
              Passengers Bus
            </span>
          </button>
          <span className="rounded-full border border-[#102b38]/10 bg-white/70 px-4 py-2 text-sm font-semibold text-[#405661]">
            Trusted bus journeys across India
          </span>
        </div>

        <nav className="flex flex-wrap items-center gap-4 text-sm font-semibold text-slate-500">
          <button type="button" onClick={() => navigate('/track-ticket')} className="transition hover:text-[#b3261e]">
            Track Ticket
          </button>
          <button type="button" onClick={() => navigate('/account?tab=notification')} className="transition hover:text-[#b3261e]">
            Need Help?
          </button>
          {isLoggedIn ? (
            <div ref={accountMenuRef} className="relative">
              <button
                type="button"
                onClick={handleAccountButtonClick}
                aria-expanded={isAccountOpen}
                aria-haspopup="menu"
                className="inline-flex max-w-56 items-center gap-3 rounded-2xl bg-[#f7f7f7] px-4 py-3 text-sm font-bold text-[#d95f53] transition hover:bg-[#fff1ec]"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#d95f53] text-xs font-extrabold text-white">
                  {initial}
                </span>
                <span className="truncate">{displayName}</span>
              </button>

              {isAccountOpen ? (
                <div
                  role="menu"
                  className="absolute right-0 top-[calc(100%+0.75rem)] z-[60] w-72 overflow-hidden rounded-2xl bg-white text-left shadow-xl shadow-slate-900/15 ring-1 ring-slate-900/5"
                >
                  <div className="py-3">
                    {accountOptions.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        role="menuitem"
                        onClick={() => handleAccountNavigate(option.id)}
                        className="flex w-full items-start gap-4 px-5 py-3 text-left transition hover:bg-slate-50"
                      >
                        <span className="mt-1 inline-flex h-8 w-8 items-center justify-center">
                          {renderIcon(option.icon)}
                        </span>
                        <span>
                          <span className="block text-lg font-bold leading-tight text-slate-900">{option.title}</span>
                          <span className="mt-1 block text-sm font-medium text-slate-500">{option.subtitle}</span>
                        </span>
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    role="menuitem"
                    onClick={handleLogout}
                    className="flex w-full items-center gap-4 border-t border-slate-100 bg-slate-50 px-5 py-3 text-left text-lg font-semibold text-slate-900 transition hover:bg-slate-100"
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-8 w-8 text-slate-400" fill="currentColor">
                      <path d="M4 4h9a2 2 0 0 1 2 2v3h-2V6H4v12h9v-3h2v3a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Zm13.6 4.4L22.2 13l-4.6 4.6-1.4-1.4 2.2-2.2H9v-2h9.4l-2.2-2.2 1.4-1.4Z" />
                    </svg>
                    Log out
                  </button>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => navigate('/?auth=login')}
                className="rounded-2xl bg-[#f7f7f7] px-4 py-3 text-sm font-bold text-[#d95f53] transition hover:bg-[#fff1ec]"
              >
                Login
              </button>
              <button
                type="button"
                onClick={() => navigate('/?auth=signup')}
                className="rounded-2xl bg-[#f7f7f7] px-4 py-3 text-sm font-bold text-[#d95f53] transition hover:bg-[#fff1ec]"
              >
                Sign up
              </button>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
};

export default AppHeader;
