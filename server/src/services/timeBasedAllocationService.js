/**
 * Time-Based Seat Allocation Service
 * Manages bus seat allocation based on time periods (morning, afternoon, evening, night)
 */

const Bus = require('../models/Bus');

// Time period definitions (hour-based)
const TIME_PERIODS = {
  morning: { start: 5, end: 11, label: 'Morning' },
  afternoon: { start: 12, end: 16, label: 'Afternoon' },
  evening: { start: 17, end: 20, label: 'Evening' },
  night: { start: 21, end: 4, label: 'Night' }
};

/**
 * Determine time period based on departure time
 * @param {Date} departureTime - The departure time
 * @returns {string} - The time period (morning, afternoon, evening, night)
 */
function getTimePeriodFromDeparture(departureTime) {
  const hour = new Date(departureTime).getHours();

  if (hour >= TIME_PERIODS.morning.start && hour < TIME_PERIODS.morning.end) {
    return 'morning';
  } else if (hour >= TIME_PERIODS.afternoon.start && hour < TIME_PERIODS.afternoon.end) {
    return 'afternoon';
  } else if (hour >= TIME_PERIODS.evening.start && hour < TIME_PERIODS.evening.end) {
    return 'evening';
  } else {
    return 'night';
  }
}

/**
 * Allocate seats for different time periods based on demand
 * @param {number} totalSeats - Total seats in the bus
 * @returns {Object} - Seat allocation for each time period
 */
function allocateSeatsForPeriods(totalSeats) {
  // Dynamic allocation based on typical demand patterns
  // Morning: 30%, Afternoon: 35%, Evening: 25%, Night: 10%
  const allocation = {
    morning: Math.floor(totalSeats * 0.30),
    afternoon: Math.floor(totalSeats * 0.35),
    evening: Math.floor(totalSeats * 0.25),
    night: Math.floor(totalSeats * 0.10)
  };

  // Ensure all seats are allocated
  const allocated = Object.values(allocation).reduce((a, b) => a + b, 0);
  if (allocated < totalSeats) {
    allocation.afternoon += (totalSeats - allocated);
  }

  return allocation;
}

/**
 * Get available seats for a specific time period on a specific date
 * @param {string} busId - Bus ID
 * @param {Date} date - The date
 * @param {string} timePeriod - The time period
 * @returns {Promise<number>} - Available seats for the time period
 */
async function getAvailableSeatsForPeriod(busId, date, timePeriod) {
  const bus = await Bus.findById(busId);
  
  if (!bus) {
    throw new Error('Bus not found');
  }

  const seatsForPeriod = bus.seatsAllocation[timePeriod] || 0;
  
  // Count booked seats for this time period on this date
  const Booking = require('../models/Booking');
  const bookings = await Booking.find({
    bus: busId,
    createdAt: {
      $gte: new Date(date.setHours(0, 0, 0, 0)),
      $lt: new Date(new Date(date).setHours(23, 59, 59, 999))
    }
  });

  const bookedCount = bookings.reduce((count, booking) => {
    if (booking.seats && Array.isArray(booking.seats)) {
      return count + booking.seats.length;
    }
    return count;
  }, 0);

  return Math.max(0, seatsForPeriod - bookedCount);
}

/**
 * Create buses with multiple time slots for a route
 * @param {Object} baseRoute - Base bus route information
 * @returns {Array} - Array of bus objects for different time periods
 */
function createBusesForMultipleTimeSlots(baseRoute) {
  const buses = [];
  const timeSlots = [
    { period: 'morning', hour: 7 },
    { period: 'afternoon', hour: 13 },
    { period: 'evening', hour: 18 },
    { period: 'night', hour: 22 }
  ];

  const seatsAllocation = allocateSeatsForPeriods(baseRoute.seats || 45);

  timeSlots.forEach(({ period, hour }) => {
    const departureTime = new Date(baseRoute.departure || new Date());
    departureTime.setHours(hour, 0, 0, 0);

    const arrivalTime = new Date(departureTime);
    const durationMinutes = baseRoute.durationMinutes || 120;
    arrivalTime.setMinutes(arrivalTime.getMinutes() + durationMinutes);

    const seatsForPeriod = seatsAllocation[period];

    buses.push({
      ...baseRoute,
      timePeriod: period,
      departure: departureTime,
      arrival: arrivalTime,
      seats: seatsForPeriod,
      availableSeats: seatsForPeriod,
      seatsAllocation: seatsAllocation
    });
  });

  return buses;
}

/**
 * Get time period statistics for a route
 * @param {string} source - Source city
 * @param {string} destination - Destination city
 * @param {Date} date - The date
 * @returns {Promise<Object>} - Statistics for each time period
 */
async function getTimePeriodStats(source, destination, date) {
  const buses = await Bus.find({
    source,
    destination,
    departure: {
      $gte: new Date(date.setHours(0, 0, 0, 0)),
      $lt: new Date(new Date(date).setHours(23, 59, 59, 999))
    }
  });

  const stats = {
    morning: { buses: 0, totalSeats: 0, availableSeats: 0 },
    afternoon: { buses: 0, totalSeats: 0, availableSeats: 0 },
    evening: { buses: 0, totalSeats: 0, availableSeats: 0 },
    night: { buses: 0, totalSeats: 0, availableSeats: 0 }
  };

  buses.forEach(bus => {
    const period = bus.timePeriod || 'morning';
    if (stats[period]) {
      stats[period].buses += 1;
      stats[period].totalSeats += bus.seats;
      stats[period].availableSeats += bus.availableSeats;
    }
  });

  return stats;
}

/**
 * Update seat allocation dynamically based on bookings
 * @param {string} busId - Bus ID
 * @param {number} seatsBooked - Number of seats booked
 * @returns {Promise<Object>} - Updated bus document
 */
async function updateAvailableSeats(busId, seatsBooked) {
  const bus = await Bus.findById(busId);
  
  if (!bus) {
    throw new Error('Bus not found');
  }

  const newAvailableSeats = Math.max(0, bus.availableSeats - seatsBooked);
  
  return await Bus.findByIdAndUpdate(
    busId,
    { availableSeats: newAvailableSeats },
    { new: true }
  );
}

module.exports = {
  TIME_PERIODS,
  getTimePeriodFromDeparture,
  allocateSeatsForPeriods,
  getAvailableSeatsForPeriod,
  createBusesForMultipleTimeSlots,
  getTimePeriodStats,
  updateAvailableSeats
};
