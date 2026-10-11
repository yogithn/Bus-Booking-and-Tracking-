function minutesSinceMidnight(date) {
  return (date.getHours() * 60) + date.getMinutes();
}

function addMinutes(date, minutes) {
  return new Date(date.getTime() + (minutes * 60 * 1000));
}

function setTimeFromMinutes(baseDate, totalMinutes) {
  const next = new Date(baseDate);
  next.setHours(0, 0, 0, 0);
  next.setMinutes(totalMinutes, 0, 0);
  return next;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

const { getCoordinatesForCity } = require('./locationService');

function toValidDate(value, fallback = new Date()) {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date(fallback) : parsed;
}

function toPositiveMinutes(value, fallback = 1) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function getDerivedDurationMinutes(departureDate, arrivalDate) {
  let derivedDurationMinutes = Math.round((arrivalDate - departureDate) / 60000);

  while (derivedDurationMinutes <= 0) {
    derivedDurationMinutes += 1440;
  }

  return derivedDurationMinutes;
}

function getSafeDurationMinutes(bus, derivedDurationMinutes) {
  const durationMinutes = toPositiveMinutes(bus.durationMinutes, derivedDurationMinutes);
  const distanceKm = getSafeDistanceKm(bus);

  if (!Number.isFinite(distanceKm) || distanceKm <= 0) {
    return durationMinutes;
  }

  const speedKmPerHour = (distanceKm / durationMinutes) * 60;
  if (speedKmPerHour >= 15 && speedKmPerHour <= 120) {
    return durationMinutes;
  }

  return Math.max(30, Math.round((distanceKm / 45) * 60));
}

function getDistanceInKm(from, to) {
  const toRad = (value) => (value * Math.PI) / 180;
  const dLat = toRad(to.lat - from.lat);
  const dLng = toRad(to.lng - from.lng);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
    + Math.cos(toRad(from.lat)) * Math.cos(toRad(to.lat))
    * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return 6371 * c;
}

function getSafeDistanceKm(bus) {
  const storedDistance = Number(bus.distance);
  if (Number.isFinite(storedDistance) && storedDistance > 0) {
    return storedDistance;
  }

  const routeEndpoints = getRouteEndpoints(bus);
  const estimatedRoadDistance = getDistanceInKm(routeEndpoints.start, routeEndpoints.end) * 1.25;
  return Number(estimatedRoadDistance.toFixed(1));
}

function generateTrackingId(value) {
  const normalized = String(value || '')
    .replace(/[^a-z0-9]/gi, '')
    .toUpperCase();
  const suffix = normalized.slice(-8).padStart(8, '0');
  return `TRK-${suffix}`;
}

function getRouteEndpoints(bus) {
  return {
    start: getCoordinatesForCity(bus.source),
    end: getCoordinatesForCity(bus.destination),
  };
}

function interpolateCoordinates(start, end, progress) {
  return {
    lat: Number((start.lat + ((end.lat - start.lat) * progress)).toFixed(6)),
    lng: Number((start.lng + ((end.lng - start.lng) * progress)).toFixed(6))
  };
}

function getScheduleForDate(bus, anchorDate) {
  const departureDate = toValidDate(bus.departure, anchorDate);
  const departureMinutes = minutesSinceMidnight(departureDate);
  const arrivalDate = toValidDate(bus.arrival, departureDate);
  const derivedDurationMinutes = getDerivedDurationMinutes(departureDate, arrivalDate);
  const durationMinutes = getSafeDurationMinutes(bus, derivedDurationMinutes);
  const departure = setTimeFromMinutes(anchorDate, departureMinutes);
  const arrival = addMinutes(departure, durationMinutes);

  return {
    departure,
    arrival,
    durationMinutes
  };
}

function buildTripSnapshot(bus, now = new Date()) {
  const todaySchedule = getScheduleForDate(bus, now);
  const previousSchedule = getScheduleForDate(bus, addMinutes(now, -1440));
  const nextSchedule = getScheduleForDate(bus, addMinutes(now, 1440));
  const candidates = [previousSchedule, todaySchedule, nextSchedule];

  const ongoingSchedule = candidates.find((schedule) => now >= schedule.departure && now <= schedule.arrival);
  const nextScheduleAfterNow = candidates
    .filter((schedule) => schedule.arrival >= now)
    .sort((left, right) => left.departure - right.departure)[0];

  const reference = ongoingSchedule || nextScheduleAfterNow || todaySchedule;
  const isOngoing = Boolean(ongoingSchedule);
  const minutesToDeparture = Math.round((reference.departure - now) / 60000);
  const minutesToArrival = Math.round((reference.arrival - now) / 60000);
  const tripProgress = isOngoing
    ? clamp((now - reference.departure) / (reference.arrival - reference.departure), 0, 1)
    : 0;
  const routeEndpoints = getRouteEndpoints(bus);

  return {
    busId: String(bus._id),
    trackingId: generateTrackingId(bus._id),
    route: bus.route,
    source: bus.source,
    destination: bus.destination,
    operator: bus.operator,
    busType: bus.busType,
    price: bus.price,
    rating: bus.rating,
    distance: getSafeDistanceKm(bus),
    availableSeats: bus.availableSeats,
    searchScore: bus.searchScore || 0,
    scheduledDeparture: reference.departure,
    scheduledArrival: reference.arrival,
    durationMinutes: reference.durationMinutes,
    isOngoing,
    isIncoming: !isOngoing && minutesToArrival >= 0,
    minutesToDeparture,
    minutesToArrival,
    progressPercent: Number((tripProgress * 100).toFixed(1)),
    coordinates: interpolateCoordinates(routeEndpoints.start, routeEndpoints.end, tripProgress),
    routeEndpoints
  };
}

function getTrackingOverview(buses, options = {}) {
  const now = options.now ? new Date(options.now) : new Date();
  const incomingWindowMinutes = Number(options.incomingWindowMinutes || 180);
  const limit = Number(options.limit || 10);
  const snapshots = buses.map((bus) => buildTripSnapshot(bus, now));

  const ongoing = snapshots
    .filter((snapshot) => snapshot.isOngoing)
    .sort((left, right) => right.progressPercent - left.progressPercent)
    .slice(0, limit);

  const incoming = snapshots
    .filter((snapshot) => !snapshot.isOngoing && snapshot.minutesToArrival >= 0 && snapshot.minutesToArrival <= incomingWindowMinutes)
    .sort((left, right) => left.minutesToArrival - right.minutesToArrival)
    .slice(0, limit);

  return {
    serverTime: now,
    incomingWindowMinutes,
    ongoing,
    incoming
  };
}

module.exports = {
  buildTripSnapshot,
  generateTrackingId,
  getScheduleForDate,
  getTrackingOverview,
};
