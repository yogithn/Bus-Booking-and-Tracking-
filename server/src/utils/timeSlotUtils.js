/**
 * Time Slot Utilities
 * Helper functions for managing bus time slots and scheduling
 */

/**
 * Time period definitions with hour ranges
 */
const TIME_SLOTS = {
  morning: {
    name: 'Morning',
    startHour: 5,
    endHour: 11,
    demandMultiplier: 1.2, // Higher demand
    busCount: 3,
    description: 'Early morning buses (5 AM - 11 AM)'
  },
  afternoon: {
    name: 'Afternoon',
    startHour: 12,
    endHour: 16,
    demandMultiplier: 0.8, // Lower demand
    busCount: 2,
    description: 'Afternoon buses (12 PM - 4 PM)'
  },
  evening: {
    name: 'Evening',
    startHour: 17,
    endHour: 20,
    demandMultiplier: 1.3, // Highest demand (office rush)
    busCount: 4,
    description: 'Evening buses (5 PM - 8 PM)'
  },
  night: {
    name: 'Night',
    startHour: 21,
    endHour: 4,
    demandMultiplier: 1.0, // Medium demand
    busCount: 2,
    description: 'Night buses (9 PM - 4 AM)'
  }
};

/**
 * Get time period from hour
 * @param {number} hour - Hour (0-23)
 * @returns {string} - Time period key
 */
function getTimePeriodByHour(hour) {
  if (hour >= TIME_SLOTS.morning.startHour && hour < TIME_SLOTS.morning.endHour) {
    return 'morning';
  } else if (hour >= TIME_SLOTS.afternoon.startHour && hour < TIME_SLOTS.afternoon.endHour) {
    return 'afternoon';
  } else if (hour >= TIME_SLOTS.evening.startHour && hour < TIME_SLOTS.evening.endHour) {
    return 'evening';
  } else {
    return 'night';
  }
}

/**
 * Get pricing multiplier based on time period (peak hours cost more)
 * @param {string} timePeriod - Time period (morning, afternoon, evening, night)
 * @returns {number} - Multiplier for pricing
 */
function getPricingMultiplier(timePeriod) {
  const multipliers = {
    morning: 1.1,    // 10% markup
    afternoon: 0.9,  // 10% discount
    evening: 1.3,    // 30% markup (peak hours)
    night: 1.0       // no change
  };
  return multipliers[timePeriod] || 1.0;
}

/**
 * Calculate dynamic price based on base price and time period
 * @param {number} basePrice - Base price
 * @param {string} timePeriod - Time period
 * @param {number} occupancyRate - Current occupancy rate (0-1)
 * @returns {number} - Calculated price
 */
function calculateDynamicPrice(basePrice, timePeriod, occupancyRate = 0) {
  const timeMultiplier = getPricingMultiplier(timePeriod);
  const occupancyMultiplier = 1 + (occupancyRate * 0.2); // 0-20% increase based on occupancy
  return Math.round(basePrice * timeMultiplier * occupancyMultiplier);
}

/**
 * Generate time slot recommendations for a route
 * @param {Object} routeStats - Route statistics
 * @returns {Array} - Array of recommended time slots with bus count
 */
function recommendTimeSlots(routeStats = {}) {
  return Object.entries(TIME_SLOTS).map(([key, slot]) => ({
    period: key,
    name: slot.name,
    startHour: slot.startHour,
    endHour: slot.endHour,
    description: slot.description,
    recommendedBuses: slot.busCount,
    demandMultiplier: slot.demandMultiplier,
    busesNeeded: Math.ceil(slot.busCount * slot.demandMultiplier)
  }));
}

/**
 * Check if current time falls within a time period
 * @param {string} timePeriod - Time period
 * @param {Date} dateTime - DateTime to check (defaults to now)
 * @returns {boolean} - True if current time is in the period
 */
function isCurrentTimePeriod(timePeriod, dateTime = new Date()) {
  const hour = dateTime.getHours();
  const slot = TIME_SLOTS[timePeriod];
  
  if (!slot) return false;

  if (slot.startHour < slot.endHour) {
    return hour >= slot.startHour && hour < slot.endHour;
  } else {
    // For night period spanning midnight
    return hour >= slot.startHour || hour < slot.endHour;
  }
}

/**
 * Get all time periods with their details
 * @returns {Object} - All time periods with details
 */
function getAllTimeSlots() {
  return TIME_SLOTS;
}

/**
 * Generate specific departure times for a time period
 * @param {string} timePeriod - Time period
 * @param {Date} baseDate - Base date
 * @param {number} count - Number of departure times
 * @returns {Array} - Array of departure times
 */
function generateDepartureTimes(timePeriod, baseDate, count = 3) {
  const slot = TIME_SLOTS[timePeriod];
  if (!slot) return [];

  const departureTimes = [];
  const timeRange = slot.endHour - slot.startHour;
  const interval = Math.floor((timeRange * 60) / (count + 1)); // Divide period into intervals

  for (let i = 1; i <= count; i++) {
    const departureDate = new Date(baseDate);
    const totalMinutes = (slot.startHour * 60) + (i * interval);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    departureDate.setHours(hours, minutes, 0, 0);
    departureTimes.push(departureDate);
  }

  return departureTimes;
}

/**
 * Get peak and off-peak hours
 * @returns {Object} - Peak and off-peak hours
 */
function getPeakHours() {
  return {
    peakHours: [17, 18, 19, 20], // Evening peak
    offPeakHours: [12, 13, 14, 15], // Afternoon off-peak
    moderateHours: [5, 6, 7, 8, 9, 10, 11] // Morning moderate
  };
}

/**
 * Format time period for display
 * @param {string} timePeriod - Time period
 * @returns {string} - Formatted display string
 */
function formatTimePeriod(timePeriod) {
  const slot = TIME_SLOTS[timePeriod];
  if (!slot) return timePeriod;
  
  const startTime = String(slot.startHour).padStart(2, '0') + ':00';
  const endTime = String(slot.endHour).padStart(2, '0') + ':00';
  return `${slot.name} (${startTime} - ${endTime})`;
}

/**
 * Get seats allocation percentage for each time period
 * @param {number} totalSeats - Total seats in bus
 * @returns {Object} - Seats allocated per period
 */
function getSeatsAllocationByPeriod(totalSeats) {
  return {
    morning: Math.ceil(totalSeats * 0.30),
    afternoon: Math.ceil(totalSeats * 0.25),
    evening: Math.ceil(totalSeats * 0.35),
    night: Math.ceil(totalSeats * 0.10)
  };
}

module.exports = {
  TIME_SLOTS,
  getTimePeriodByHour,
  getPricingMultiplier,
  calculateDynamicPrice,
  recommendTimeSlots,
  isCurrentTimePeriod,
  getAllTimeSlots,
  generateDepartureTimes,
  getPeakHours,
  formatTimePeriod,
  getSeatsAllocationByPeriod
};
