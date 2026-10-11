const { estimatePrice, inferSeatCount, normalizeCity, estimatePriceWithRealDistance } = require('../utils/busData');
const { loadSearchModel, scoreBusSearchResult } = require('./busSearchModel');
const { getScheduleForDate } = require('./busTrackingService');
const { getRealDistance, getPriceRateByDistance, getBusTypeMultiplier } = require('./googleMapsService');

function average(values, fallback = 0) {
  if (!values.length) {
    return fallback;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function buildDateWithTime(baseDate, hour, minute) {
  const next = new Date(baseDate);
  next.setHours(hour, minute, 0, 0);
  return next;
}

function stableHash(value) {
  let hash = 0;
  for (const char of String(value || '')) {
    hash = ((hash << 5) - hash) + char.charCodeAt(0);
    hash |= 0;
  }
  return Math.abs(hash);
}

function pickOperatorPool(sourceTemplates, destinationTemplates) {
  const operators = [...sourceTemplates, ...destinationTemplates]
    .map((bus) => bus.operator)
    .filter(Boolean);

  return [...new Set(operators)].slice(0, 6);
}

function pickBusTypePool(sourceTemplates, destinationTemplates) {
  const busTypes = [...sourceTemplates, ...destinationTemplates]
    .map((bus) => bus.busType)
    .filter(Boolean);

  if (busTypes.length === 0) {
    return [
      'A/C Sleeper (2+1)',
      'A/C Seater (2+2)',
      'Non A/C Seater / Sleeper (2+1)',
      'Electric A/C Seater (2+2)'
    ];
  }

  return [...new Set(busTypes)].slice(0, 6);
}

function estimateDistance(sourceTemplates, destinationTemplates, model) {
  const distances = [...sourceTemplates, ...destinationTemplates]
    .map((bus) => Number(bus.distance) || 0)
    .filter((distance) => distance > 0);

  if (distances.length > 0) {
    return Math.round(average(distances));
  }

  const routeDistances = Object.values(model.routes || {})
    .map((route) => Number(route.avgDistance) || 0)
    .filter((distance) => distance > 0);

  return Math.round(average(routeDistances, 280));
}

function estimateDuration(distance, sourceTemplates, destinationTemplates, model) {
  const durations = [...sourceTemplates, ...destinationTemplates]
    .map((bus) => Number(bus.durationMinutes) || 0)
    .filter((duration) => duration > 0);

  if (durations.length > 0) {
    return Math.max(60, Math.round(average(durations)));
  }

  const globalDuration = Number(model.global?.avgDurationMinutes) || 360;
  const averageDistance = estimateDistance(sourceTemplates, destinationTemplates, model);
  const averageSpeed = averageDistance > 0 ? averageDistance / Math.max(globalDuration / 60, 1) : 45;
  return Math.max(90, Math.round((distance / Math.max(averageSpeed, 35)) * 60));
}

/**
 * Calculate price using Google Maps real distance and market rates
 */
async function calculateRealisticPrice(source, destination, busType) {
  try {
    const realDistance = await getRealDistance(source, destination);
    const baseRate = getPriceRateByDistance(realDistance);
    const multiplier = getBusTypeMultiplier(busType);
    const price = Math.max(300, Math.round(realDistance * baseRate * multiplier));
    return price;
  } catch (error) {
    console.warn(`Failed to get real distance for ${source}-${destination}, using fallback:`, error.message);
    // Fallback to model-based pricing
    const model = loadSearchModel();
    return estimatePrice(280, busType, model); // 280 km as default
  }
}

/**
 * Get seat availability based on departure time
 * Peak hours (9 AM - 4 PM): fewer seats available
 * Early morning & late night: more seats available
 */
function getTimeBasedAvailability(hour, totalSeats) {
  let availabilityRatio;
  
  // Morning peak (6 AM - 9 AM): Good availability, people commuting
  if (hour >= 6 && hour < 9) {
    availabilityRatio = 0.5 + Math.random() * 0.2; // 50-70%
  }
  // Morning (9 AM - 12 PM): Lower availability
  else if (hour >= 9 && hour < 12) {
    availabilityRatio = 0.25 + Math.random() * 0.15; // 25-40%
  }
  // Afternoon peak (12 PM - 4 PM): Very low availability
  else if (hour >= 12 && hour < 16) {
    availabilityRatio = 0.15 + Math.random() * 0.15; // 15-30%
  }
  // Late afternoon (4 PM - 6 PM): Moderate availability
  else if (hour >= 16 && hour < 18) {
    availabilityRatio = 0.35 + Math.random() * 0.2; // 35-55%
  }
  // Evening (6 PM - 8 PM): Good availability, evening travelers
  else if (hour >= 18 && hour < 20) {
    availabilityRatio = 0.5 + Math.random() * 0.2; // 50-70%
  }
  // Night (8 PM onwards / before 6 AM): Excellent availability
  else {
    availabilityRatio = 0.6 + Math.random() * 0.25; // 60-85%
  }

  const availableSeats = Math.max(4, Math.round(totalSeats * availabilityRatio));
  return Math.min(totalSeats - 1, availableSeats);
}

/**
 * Enhanced departure slots with more realistic timing throughout the day
 * Covers morning, afternoon, evening, and night buses
 */
function getEnhancedDepartureSlots() {
  return [
    // Early Morning (5 AM - 7 AM): Night travelers ending, early morning commuters
    { hour: 5, minute: 0, period: 'Early Morning', description: 'Overnight service' },
    { hour: 5, minute: 30, period: 'Early Morning', description: 'Early morning' },
    { hour: 6, minute: 0, period: 'Early Morning', description: 'Early morning' },
    { hour: 6, minute: 30, period: 'Early Morning', description: 'Early morning' },
    
    // Morning (7 AM - 11 AM): Peak morning travel
    { hour: 7, minute: 0, period: 'Morning', description: 'Morning rush' },
    { hour: 7, minute: 30, period: 'Morning', description: 'Morning' },
    { hour: 8, minute: 0, period: 'Morning', description: 'Morning rush' },
    { hour: 8, minute: 30, period: 'Morning', description: 'Morning' },
    { hour: 9, minute: 0, period: 'Morning', description: 'Mid-morning' },
    { hour: 9, minute: 30, period: 'Morning', description: 'Mid-morning' },
    { hour: 10, minute: 0, period: 'Morning', description: 'Late morning' },
    { hour: 10, minute: 30, period: 'Morning', description: 'Late morning' },
    
    // Afternoon (12 PM - 4 PM): Post-lunch and afternoon travel
    { hour: 12, minute: 0, period: 'Afternoon', description: 'Afternoon' },
    { hour: 12, minute: 30, period: 'Afternoon', description: 'Afternoon' },
    { hour: 14, minute: 0, period: 'Afternoon', description: 'Afternoon' },
    { hour: 14, minute: 30, period: 'Afternoon', description: 'Afternoon' },
    { hour: 15, minute: 0, period: 'Afternoon', description: 'Late afternoon' },
    { hour: 15, minute: 30, period: 'Afternoon', description: 'Late afternoon' },
    
    // Evening (4 PM - 8 PM): Commuters and travelers
    { hour: 16, minute: 0, period: 'Evening', description: 'Evening' },
    { hour: 16, minute: 30, period: 'Evening', description: 'Evening' },
    { hour: 17, minute: 0, period: 'Evening', description: 'Evening rush' },
    { hour: 17, minute: 30, period: 'Evening', description: 'Evening' },
    { hour: 18, minute: 0, period: 'Evening', description: 'Evening' },
    { hour: 18, minute: 30, period: 'Evening', description: 'Evening' },
    { hour: 19, minute: 0, period: 'Evening', description: 'Night departure' },
    { hour: 19, minute: 30, period: 'Evening', description: 'Night departure' },
    
    // Night (8 PM - 5 AM): Night travelers and early starters
    { hour: 20, minute: 0, period: 'Night', description: 'Night journey' },
    { hour: 20, minute: 30, period: 'Night', description: 'Night journey' },
    { hour: 21, minute: 0, period: 'Night', description: 'Night journey' },
    { hour: 21, minute: 30, period: 'Night', description: 'Night journey' },
    { hour: 22, minute: 0, period: 'Night', description: 'Night journey' },
    { hour: 22, minute: 30, period: 'Night', description: 'Night journey' },
    { hour: 23, minute: 0, period: 'Night', description: 'Late night' },
    { hour: 23, minute: 30, period: 'Night', description: 'Late night' }
  ];
}

async function generateSyntheticRouteBuses({ from, to, selectedDate, sourceTemplates = [], destinationTemplates = [] }) {
  const source = normalizeCity(from);
  const destination = normalizeCity(to);
  const model = loadSearchModel();
  const routeInsights = model.routes?.[`${source.toLowerCase()}__${destination.toLowerCase()}`] || null;
  const operators = pickOperatorPool(sourceTemplates, destinationTemplates);
  const busTypes = pickBusTypePool(sourceTemplates, destinationTemplates);
  const distance = routeInsights?.avgDistance || estimateDistance(sourceTemplates, destinationTemplates, model);
  const durationMinutes = routeInsights?.avgDurationMinutes || estimateDuration(distance, sourceTemplates, destinationTemplates, model);
  const avgRating = routeInsights?.avgRating || Number(model.global?.avgRating) || 4.1;
  
  // Get all available departure slots
  const allDepartureSlots = getEnhancedDepartureSlots();
  
  // For each search, randomly select 8-12 buses from available slots
  // This ensures variety while keeping reasonable numbers
  const departureSlots = allDepartureSlots
    .sort(() => 0.5 - Math.random()) // Shuffle
    .slice(0, 8 + Math.floor(Math.random() * 5)); // Take 8-12 random slots

  // Calculate realistic prices for all buses in parallel
  const pricePromises = departureSlots.map((slot, index) => {
    const busType = busTypes[index % busTypes.length];
    return calculateRealisticPrice(source, destination, busType)
      .then(price => ({ index, price }))
      .catch(err => {
        console.error(`Error calculating price for slot ${index}:`, err.message);
        return { index, price: routeInsights?.avgPrice || estimatePrice(distance, busType, model) };
      });
  });

  const priceResults = await Promise.all(pricePromises);
  const priceMap = new Map(priceResults.map(r => [r.index, r.price]));

  return departureSlots.map((slot, index) => {
    const busType = busTypes[index % busTypes.length];
    const operator = operators[index % operators.length] || `${source} Express`;
    const departure = buildDateWithTime(selectedDate, slot.hour, slot.minute);
    const arrival = new Date(departure.getTime() + (durationMinutes * 60 * 1000));
    const seats = inferSeatCount(busType);
    
    // Use time-based seat availability
    const availableSeats = getTimeBasedAvailability(slot.hour, seats);
    const windowSeats = Math.max(2, Math.round(availableSeats * 0.3));
    
    const syntheticBus = {
      _id: `synthetic-${source.toLowerCase()}-${destination.toLowerCase()}-${index + 1}`,
      route: `${source} - ${destination}`,
      source,
      destination,
      operator,
      busType,
      departure,
      arrival,
      durationMinutes,
      seats,
      availableSeats,
      windowSeats,
      price: priceMap.get(index) || routeInsights?.avgPrice || estimatePrice(distance, busType, model),
      rating: Number(avgRating.toFixed(1)),
      distance,
      searchScore: 0,
      dataSource: 'synthetic_model',
      synthetic: true,
      location: source,
      // New fields for time period information
      timePeriod: slot.period,
      timeDescription: slot.description
    };

    const scheduledBus = {
      ...syntheticBus,
      ...getScheduleForDate(syntheticBus, selectedDate)
    };

    return {
      ...scheduledBus,
      inferredSearchScore: scoreBusSearchResult(scheduledBus)
    };
  }).sort((left, right) => right.inferredSearchScore - left.inferredSearchScore);
}

module.exports = {
  generateSyntheticRouteBuses,
};
