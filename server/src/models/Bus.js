const mongoose = require('mongoose');

const busSchema = new mongoose.Schema({
  route: { type: String, required: true },
  source: { type: String, index: true },
  destination: { type: String, index: true },
  operator: { type: String },
  busType: { type: String },
  departure: { type: Date, required: true },
  arrival: { type: Date, required: true },
  durationMinutes: { type: Number },
  seats: { type: Number, required: true },
  availableSeats: { type: Number, required: true },
  windowSeats: { type: Number, default: 0 },
  price: { type: Number, required: true },
  rating: { type: Number, default: 0 },
  distance: { type: Number, default: 0 },
  searchScore: { type: Number, default: 0 },
  dataSource: { type: String, enum: ['cleaned_bus', 'pan_india', 'synthetic_model'], default: 'cleaned_bus' },
  location: { type: String },
  timePeriod: { 
    type: String, 
    enum: ['morning', 'afternoon', 'evening', 'night'], 
    default: 'morning',
    index: true 
  },
  seatsAllocation: {
    morning: { type: Number, default: 0 },
    afternoon: { type: Number, default: 0 },
    evening: { type: Number, default: 0 },
    night: { type: Number, default: 0 }
  }
}, { timestamps: true });

module.exports = mongoose.model('Bus', busSchema);
