import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import SearchResults from './pages/SearchResults';
import Booking from './pages/Booking';
import CheckoutInfo from './pages/CheckoutInfo';
import Payment from './pages/Payment';
import Tracking from './pages/Tracking';
import History from './pages/History';
import Account from './pages/Account';
import TrackTicket from './pages/TrackTicket';
import AppHeader from './components/AppHeader';
import { AuthProvider } from './context/AuthContext';
import './App.css';

function App() {
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    if (token) {
      localStorage.setItem('token', token);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  return (
    <Router>
      <AuthProvider>
        <div className="App">
          <AppHeader />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/search" element={<SearchResults />} />
            <Route path="/booking/:id" element={<Booking />} />
            <Route path="/checkout-info" element={<CheckoutInfo />} />
            <Route path="/payment" element={<Payment />} />
            <Route path="/tracking/:id" element={<Tracking />} />
            <Route path="/track-ticket" element={<TrackTicket />} />
            <Route path="/history" element={<History />} />
            <Route path="/account" element={<Account />} />
          </Routes>
        </div>
      </AuthProvider>
    </Router>
  );
}

export default App;
