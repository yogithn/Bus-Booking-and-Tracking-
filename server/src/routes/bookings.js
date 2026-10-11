const express = require('express');
const mongoose = require('mongoose');
const Booking = require('../models/Booking');
const Bus = require('../models/Bus');
const auth = require('../middleware/auth');

const router = express.Router();

function normalizeSeatNumbers(seats) {
  return Array.isArray(seats) ? seats.map(Number) : [];
}

function isValidSeatArray(seats) {
  return Array.isArray(seats)
    && seats.length > 0
    && seats.every((seat) => Number.isInteger(seat) && seat > 0)
    && new Set(seats).size === seats.length;
}

// Create booking
router.post('/', auth, async (req, res) => {
  const { busId, seats } = req.body;

  if (!busId || !mongoose.Types.ObjectId.isValid(busId)) {
    return res.status(400).json({ message: 'Valid busId is required' });
  }

  if (!isValidSeatArray(seats)) {
    return res.status(400).json({ message: 'Seats must be a non-empty array of unique positive integers' });
  }

  const normalizedSeats = normalizeSeatNumbers(seats);

  try {
    // Check if bus exists and has available seats
    const bus = await Bus.findById(busId);
    if (!bus) {
      return res.status(404).json({ message: 'Bus not found' });
    }

    if (bus.availableSeats < normalizedSeats.length) {
      return res.status(400).json({ message: 'Not enough seats' });
    }

    const mockPayment = {
      id: `mock_pay_${Date.now()}`,
      status: 'succeeded'
    };

    // Update bus available seats
    await Bus.findByIdAndUpdate(
      busId,
      { $inc: { availableSeats: -normalizedSeats.length } },
      { new: true }
    );

    // Create booking
    const booking = new Booking({
      user: req.user.id,
      bus: busId,
      seats: normalizedSeats,
      paymentReferenceId: mockPayment.id
    });
    await booking.save();

    res.json({ booking, payment: mockPayment });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get user bookings
router.get('/', auth, async (req, res) => {
  try {
    const bookings = await Booking.find({ user: req.user.id }).populate('bus');
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Delete user booking
router.delete('/:id', auth, async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: 'Valid booking id is required' });
  }

  try {
    const booking = await Booking.findOne({ _id: id, user: req.user.id });
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    if (booking.bus && booking.seats?.length) {
      await Bus.findByIdAndUpdate(
        booking.bus,
        { $inc: { availableSeats: booking.seats.length } },
        { new: true }
      );
    }

    await Booking.deleteOne({ _id: booking._id });
    res.json({ message: 'Booking deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
