/**
 * Google Maps Distance Matrix API Integration
 * Provides accurate real-world distance and duration calculations
 */

const cache = new Map();
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours
const { getCoordinatesForCity } = require('./locationService');

// PRICING RATES (per km) - adjusted based on real market data and distance
const PRICE_RATES_BY_DISTANCE = {
  short: { km: 'up to 100', rate: 3.5 }, // ₹3.5/km for short routes
  medium: { km: '101-300', rate: 3.0 }, // ₹3.0/km for medium routes
  long: { km: '301-600', rate: 2.8 }, // ₹2.8/km for long routes
  extraLong: { km: '600+', rate: 2.5 } // ₹2.5/km for very long routes
};

// Bus type multipliers (premium charges)
const BUS_TYPE_MULTIPLIERS = {
  'a/c sleeper (2+1)': 1.8,
  'a/c seater (2+2)': 1.4,
  'non a/c seater / sleeper (2+1)': 1.0,
  'non a/c seater': 0.9,
  'electric a/c seater (2+2)': 1.6,
  'default': 1.2
};

/**
 * Calculate straight-line distance using Haversine formula (fallback)
 * Returns distance in km
 */
function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

/**
 * Get distance from Google Maps Distance Matrix API
 * Falls back to Haversine if API is unavailable
 */
async function getRealDistance(source, destination) {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  
  if (!apiKey) {
    console.warn('⚠️  GOOGLE_MAPS_API_KEY not configured. Using Haversine fallback.');
    return getHaversineDistance(source, destination);
  }

  const cacheKey = `${source.toLowerCase()}_${destination.toLowerCase()}`;
  const cached = cache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.distance;
  }

  try {
    const sourceCoords = getCoordinatesForCity(source);
    const destCoords = getCoordinatesForCity(destination);

    const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${sourceCoords.lat},${sourceCoords.lng}&destinations=${destCoords.lat},${destCoords.lng}&mode=driving&key=${apiKey}`;

    const response = await fetch(url, { timeout: 5000 });
    const data = await response.json();

    if (data.rows?.[0]?.elements?.[0]?.distance?.value) {
      const distanceInMeters = data.rows[0].elements[0].distance.value;
      const distanceInKm = Math.round(distanceInMeters / 1000);

      // Cache the result
      cache.set(cacheKey, {
        distance: distanceInKm,
        timestamp: Date.now()
      });

      return distanceInKm;
    }

    // Fallback to Haversine if API response is invalid
    return getHaversineDistance(source, destination);
  } catch (error) {
    console.error('Error fetching distance from Google Maps:', error.message);
    // Fallback to Haversine
    return getHaversineDistance(source, destination);
  }
}

/**
 * Get Haversine distance (fallback method)
 */
function getHaversineDistance(source, destination) {
  const sourceCoords = getCoordinatesForCity(source);
  const destCoords = getCoordinatesForCity(destination);
  return calculateHaversineDistance(sourceCoords.lat, sourceCoords.lng, destCoords.lat, destCoords.lng);
}

/**
 * Get the appropriate price rate based on distance
 */
function getPriceRateByDistance(distanceKm) {
  if (distanceKm <= 100) {
    return PRICE_RATES_BY_DISTANCE.short.rate;
  }
  if (distanceKm <= 300) {
    return PRICE_RATES_BY_DISTANCE.medium.rate;
  }
  if (distanceKm <= 600) {
    return PRICE_RATES_BY_DISTANCE.long.rate;
  }
  return PRICE_RATES_BY_DISTANCE.extraLong.rate;
}

/**
 * Get bus type multiplier
 */
function getBusTypeMultiplier(busType) {
  if (!busType) {
    return BUS_TYPE_MULTIPLIERS.default;
  }
  
  const normalized = String(busType).toLowerCase().trim();
  return BUS_TYPE_MULTIPLIERS[normalized] || BUS_TYPE_MULTIPLIERS.default;
}

/**
 * Calculate realistic price based on real distance and bus type
 * Price Formula: distance × rate_by_distance × bus_type_multiplier
 * Minimum price: ₹300 for very short routes
 */
async function calculatePrice(source, destination, busType) {
  try {
    const distance = await getRealDistance(source, destination);
    const baseRate = getPriceRateByDistance(distance);
    const multiplier = getBusTypeMultiplier(busType);
    const price = Math.max(300, Math.round(distance * baseRate * multiplier));
    
    return {
      price,
      distance,
      baseRate,
      multiplier,
      breakdown: {
        distance_km: distance,
        rate_per_km: baseRate,
        bus_type_multiplier: multiplier,
        formula: `${distance} × ${baseRate} × ${multiplier} = ${price}`
      }
    };
  } catch (error) {
    console.error('Error calculating price:', error.message);
    throw error;
  }
}

/**
 * Get duration from Google Maps (in minutes)
 */
async function getRouteDuration(source, destination) {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  
  if (!apiKey) {
    console.warn('⚠️  GOOGLE_MAPS_API_KEY not configured. Using distance-based estimation.');
    const distance = await getRealDistance(source, destination);
    // Assume average speed of 45 km/h for long-distance buses
    return Math.round((distance / 45) * 60);
  }

  const cacheKey = `duration_${source.toLowerCase()}_${destination.toLowerCase()}`;
  const cached = cache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.duration;
  }

  try {
    const sourceCoords = getCoordinatesForCity(source);
    const destCoords = getCoordinatesForCity(destination);

    const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${sourceCoords.lat},${sourceCoords.lng}&destinations=${destCoords.lat},${destCoords.lng}&mode=driving&key=${apiKey}`;

    const response = await fetch(url, { timeout: 5000 });
    const data = await response.json();

    if (data.rows?.[0]?.elements?.[0]?.duration?.value) {
      const durationInSeconds = data.rows[0].elements[0].duration.value;
      const durationInMinutes = Math.round(durationInSeconds / 60);

      cache.set(cacheKey, {
        duration: durationInMinutes,
        timestamp: Date.now()
      });

      return durationInMinutes;
    }

    // Fallback
    const distance = await getRealDistance(source, destination);
    return Math.round((distance / 45) * 60);
  } catch (error) {
    console.error('Error fetching duration from Google Maps:', error.message);
    const distance = await getRealDistance(source, destination);
    return Math.round((distance / 45) * 60);
  }
}

/**
 * Clear cache (useful for testing or manual refresh)
 */
function clearCache() {
  cache.clear();
}

/**
 * Get cache statistics
 */
function getCacheStats() {
  return {
    size: cache.size,
    entries: Array.from(cache.entries()).map(([key, value]) => ({
      key,
      ...value
    }))
  };
}

module.exports = {
  getRealDistance,
  getHaversineDistance,
  calculatePrice,
  getRouteDuration,
  getPriceRateByDistance,
  getBusTypeMultiplier,
  clearCache,
  getCacheStats,
  PRICE_RATES_BY_DISTANCE,
  BUS_TYPE_MULTIPLIERS
};
