const { getCoordinatesForCity } = require('./locationService');

/**
 * Fetches actual route duration from OSRM (OpenStreetMap Routing Machine)
 * Returns duration in minutes
 */
async function getActualRouteDuration(source, destination, timeout = 5000) {
  try {
    const sourceCoords = getCoordinatesForCity(source);
    const destCoords = getCoordinatesForCity(destination);

    const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${sourceCoords.lng},${sourceCoords.lat};${destCoords.lng},${destCoords.lat}?overview=full`;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(osrmUrl, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      const route = data.routes?.[0];

      if (route && route.duration) {
        // OSRM returns duration in seconds, convert to minutes
        const durationMinutes = Math.round(route.duration / 60);
        const distanceKm = Math.round((route.distance / 1000) * 10) / 10;
        return {
          durationMinutes,
          distanceKm,
          source: sourceCoords,
          destination: destCoords,
        };
      }

      return null;
    } catch (timeoutError) {
      clearTimeout(timeoutId);
      if (timeoutError.name === 'AbortError') {
        console.warn(`OSRM timeout for ${source} to ${destination} after ${timeout}ms`);
      }
      return null;
    }
  } catch (error) {
    console.warn(`Failed to fetch route duration for ${source} to ${destination}:`, error.message);
    return null;
  }
}

/**
 * Validates if a duration is reasonable for the distance
 * Returns the duration if reasonable, null if it needs correction
 */
function isReasonableDuration(durationMinutes, distanceKm) {
  if (!durationMinutes || !distanceKm) {
    return false;
  }

  // Calculate implied speed: km per hour
  const speedKmPerHour = (distanceKm / durationMinutes) * 60;

  // Bus speeds can vary widely depending on route and traffic.
  // Accept slower urban averages and higher highway bursts.
  // Minimum: 15 km/h (slow city conditions), Maximum: 120 km/h (rare highway bursts)
  return speedKmPerHour >= 15 && speedKmPerHour <= 120;
}

/**
 * Corrects and validates route duration for a bus record
 * Uses map-based calculation to ensure accuracy
 */
async function validateAndCorrectDuration(bus) {
  const { source, destination, durationMinutes, distance } = bus;

  if (!source || !destination) {
    return bus;
  }

  // If duration seems reasonable, keep it
  if (durationMinutes && isReasonableDuration(durationMinutes, distance)) {
    return bus;
  }

  // Otherwise, try to fetch from OSRM
  const routeData = await getActualRouteDuration(source, destination);
  
  if (routeData) {
    return {
      ...bus,
      durationMinutes: routeData.durationMinutes,
      distance: routeData.distanceKm,
    };
  }

  // Fallback: estimate based on average speed (45 km/h) and allow shorter trips
  if (distance && distance > 0) {
    const estimatedDuration = Math.round((distance / 45) * 60);
    return {
      ...bus,
      durationMinutes: Math.max(30, estimatedDuration), // minimum 30 minutes for short trips
    };
  }

  return bus;
}

/**
 * Corrects duration for multiple buses
 */
async function validateAndCorrectBuses(buses) {
  return Promise.all(buses.map(bus => validateAndCorrectDuration(bus)));
}

/**
 * Format duration for display
 */
function formatDuration(durationMinutes) {
  if (!durationMinutes || durationMinutes <= 0) {
    return 'N/A';
  }

  const hours = Math.floor(durationMinutes / 60);
  const minutes = durationMinutes % 60;

  if (hours === 0) {
    return `${minutes}m`;
  }

  if (minutes === 0) {
    return `${hours}h`;
  }

  return `${hours}h ${minutes}m`;
}

module.exports = {
  getActualRouteDuration,
  isReasonableDuration,
  validateAndCorrectDuration,
  validateAndCorrectBuses,
  formatDuration,
  getCoordinatesForCity,
};
