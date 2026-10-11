const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  bus: { type: mongoose.Schema.Types.ObjectId, ref: 'Bus', required: true },
  seats: {
    type: [{ type: Number, min: 1 }],
    required: true,
    validate: {
      validator: (seats) => Array.isArray(seats) && seats.length > 0 && new Set(seats).size === seats.length,
      message: 'Seats must be a non-empty array of unique numbers'
    }
  },
  status: { type: String, enum: ['pending', 'confirmed', 'cancelled'], default: 'confirmed' },
  paymentReferenceId: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Booking', bookingSchema);
