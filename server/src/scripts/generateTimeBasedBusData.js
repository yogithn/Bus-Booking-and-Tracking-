/**
 * Generate Time-Based Bus Data
 * This script generates buses with multiple time slots throughout the day
 * and allocates seats according to demand patterns
 */

const mongoose = require('mongoose');
const Bus = require('../models/Bus');
const { createBusesForMultipleTimeSlots, allocateSeatsForPeriods } = require('../services/timeBasedAllocationService');
const { generateDepartureTimes } = require('../utils/timeSlotUtils');

// Popular bus routes in India
const POPULAR_ROUTES = [
  { source: 'Delhi', destination: 'Agra', distance: 240, durationMinutes: 240, basePrice: 600 },
  { source: 'Delhi', destination: 'Jaipur', distance: 270, durationMinutes: 300, basePrice: 700 },
  { source: 'Agra', destination: 'Lucknow', distance: 334, durationMinutes: 360, basePrice: 800 },
  { source: 'Mumbai', destination: 'Pune', distance: 150, durationMinutes: 150, basePrice: 500 },
  { source: 'Bangalore', destination: 'Hyderabad', distance: 570, durationMinutes: 600, basePrice: 900 },
  { source: 'Chennai', destination: 'Bangalore', distance: 350, durationMinutes: 360, basePrice: 700 },
  { source: 'Kolkata', destination: 'Delhi', distance: 1540, durationMinutes: 1680, basePrice: 1200 },
  { source: 'Mumbai', destination: 'Ahmedabad', distance: 425, durationMinutes: 480, basePrice: 800 },
  { source: 'Delhi', destination: 'Chandigarh', distance: 240, durationMinutes: 300, basePrice: 600 },
  { source: 'Goa', destination: 'Bangalore', distance: 620, durationMinutes: 720, basePrice: 900 }
];

const BUS_OPERATORS = [
  'RedBus Premium',
  'GoIBIBO Express',
  'Volvo Travels',
  'Shatabdi Express',
  'Innova Travels',
  'Orange Tours',
  'VRL Logistics',
  'KPN Tours'
];

const BUS_TYPES = [
  'AC Sleeper',
  'AC Semi-Sleeper',
  'Non-AC Sleeper',
  'Volvo AC'
];

/**
 * Generate multiple buses for each time period on a given date
 * @param {Date} date - The date to generate buses for
 * @returns {Array} - Array of bus objects to be inserted
 */
function generateBusesForDate(date) {
  const buses = [];
  const baseDate = new Date(date);
  baseDate.setHours(0, 0, 0, 0);

  POPULAR_ROUTES.forEach(route => {
    const timePeriods = ['morning', 'afternoon', 'evening', 'night'];
    const seatsAllocation = allocateSeatsForPeriods(45); // Standard 45-seat bus

    timePeriods.forEach(period => {
      // Generate 2-3 buses per time period
      const busesPerPeriod = period === 'evening' ? 3 : period === 'morning' ? 2 : 2;
      
      const departureTimes = generateDepartureTimes(period, baseDate, busesPerPeriod);

      departureTimes.forEach((departureTime, index) => {
        const arrivalTime = new Date(departureTime);
        arrivalTime.setMinutes(arrivalTime.getMinutes() + route.durationMinutes);

        buses.push({
          route: `${route.source} → ${route.destination}`,
          source: route.source,
          destination: route.destination,
          operator: BUS_OPERATORS[Math.floor(Math.random() * BUS_OPERATORS.length)],
          busType: BUS_TYPES[Math.floor(Math.random() * BUS_TYPES.length)],
          departure: departureTime,
          arrival: arrivalTime,
          durationMinutes: route.durationMinutes,
          distance: route.distance,
          timePeriod: period,
          seats: seatsAllocation[period],
          availableSeats: seatsAllocation[period],
          seatsAllocation: seatsAllocation,
          price: calculateDynamicPrice(route.basePrice, period),
          rating: (Math.random() * 2 + 3.5).toFixed(1),
          windowSeats: Math.floor(seatsAllocation[period] * 0.4),
          dataSource: 'synthetic_model'
        });
      });
    });
  });

  return buses;
}

/**
 * Calculate dynamic price based on time period
 * @param {number} basePrice - Base price
 * @param {string} timePeriod - Time period (morning, afternoon, evening, night)
 * @returns {number} - Calculated price
 */
function calculateDynamicPrice(basePrice, timePeriod) {
  const multipliers = {
    morning: 0.95,    // 5% discount - off-peak
    afternoon: 0.90,  // 10% discount - low demand
    evening: 1.25,    // 25% premium - peak hours
    night: 1.05       // 5% premium - night services
  };

  return Math.round(basePrice * (multipliers[timePeriod] || 1));
}

/**
 * Main function to generate and insert bus data
 * @param {string} connectionString - MongoDB connection string
 * @param {Date} startDate - Start date for bus generation
 * @param {number} daysCount - Number of days to generate buses for
 */
async function generateTimeBasedBusData(connectionString, startDate, daysCount = 1) {
  try {
    // Connect to MongoDB
    await mongoose.connect(connectionString, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    console.log('Connected to MongoDB');

    // Generate buses for each day
    let allBuses = [];
    for (let i = 0; i < daysCount; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      const busesForDay = generateBusesForDate(date);
      allBuses = allBuses.concat(busesForDay);
    }

    console.log(`Generated ${allBuses.length} bus records`);

    // Insert buses into database
    const result = await Bus.insertMany(allBuses, { ordered: false });
    console.log(`Successfully inserted ${result.length} buses into the database`);

    // Display summary statistics
    const summary = {
      byTimePeriod: {},
      byRoute: {},
      byOperator: {}
    };

    allBuses.forEach(bus => {
      // By time period
      summary.byTimePeriod[bus.timePeriod] = (summary.byTimePeriod[bus.timePeriod] || 0) + 1;
      
      // By route
      summary.byRoute[bus.route] = (summary.byRoute[bus.route] || 0) + 1;
      
      // By operator
      summary.byOperator[bus.operator] = (summary.byOperator[bus.operator] || 0) + 1;
    });

    console.log('\n=== Generation Summary ===');
    console.log('\nBuses by Time Period:');
    Object.entries(summary.byTimePeriod).forEach(([period, count]) => {
      console.log(`  ${period}: ${count} buses`);
    });

    console.log('\nTop 5 Routes:');
    Object.entries(summary.byRoute)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .forEach(([route, count]) => {
        console.log(`  ${route}: ${count} buses`);
      });

    console.log('\nBuses by Operator:');
    Object.entries(summary.byOperator).forEach(([operator, count]) => {
      console.log(`  ${operator}: ${count} buses`);
    });

    await mongoose.connection.close();
    console.log('\nDatabase connection closed');
  } catch (err) {
    console.error('Error generating bus data:', err.message);
    process.exit(1);
  }
}

// Export for use in other scripts
module.exports = {
  generateBusesForDate,
  calculateDynamicPrice,
  generateTimeBasedBusData,
  POPULAR_ROUTES,
  BUS_OPERATORS,
  BUS_TYPES
};

// Run if executed directly
if (require.main === module) {
  const connectionString = process.env.MONGODB_URI || 'mongodb://localhost:27017/bus-booking';
  const startDate = new Date();
  generateTimeBasedBusData(connectionString, startDate, 3);
}
