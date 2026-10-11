const fs = require('fs');
const path = require('path');
const { parseCsv } = require('./csv');
const { getRealDistance, getPriceRateByDistance, getBusTypeMultiplier } = require('../services/googleMapsService');

const DEFAULT_MODEL_PATH = path.join(__dirname, '..', 'data', 'bus-search-model.json');

function toTitleCase(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function normalizeCity(value) {
  return toTitleCase(String(value || '').replace(/\s+/g, ' '));
}

function parseNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseDurationMinutes(value) {
  if (!value) {
    return 0;
  }

  const hrsMatch = String(value).match(/(\d+)\s*hrs?/i);
  const minsMatch = String(value).match(/(\d+)\s*mins?/i);

  if (hrsMatch || minsMatch) {
    return (parseInt(hrsMatch?.[1] || '0', 10) * 60) + parseInt(minsMatch?.[1] || '0', 10);
  }

  const parts = String(value).split(':').map((part) => parseInt(part || '0', 10));
  if (parts.every((part) => Number.isFinite(part))) {
    if (parts.length === 3) {
      return (parts[0] * 60) + parts[1] + Math.round(parts[2] / 60);
    }
    if (parts.length === 2) {
      return (parts[0] * 60) + parts[1];
    }
  }

  return 0;
}

function toDate(value, fallback = null) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? fallback : date;
}

function parseClockTime(value) {
  const match = String(value || '').trim().match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*([AP]M)$/i);
  if (!match) {
    return null;
  }

  let hour = parseInt(match[1], 10);
  const minute = parseInt(match[2], 10);
  const second = parseInt(match[3] || '0', 10);
  const meridiem = match[4].toUpperCase();

  if (meridiem === 'PM' && hour !== 12) {
    hour += 12;
  }
  if (meridiem === 'AM' && hour === 12) {
    hour = 0;
  }

  return { hour, minute, second };
}

function buildDateFromClock(baseDate, clockValue) {
  const clock = parseClockTime(clockValue);
  const date = new Date(baseDate);

  if (!clock) {
    return date;
  }

  date.setHours(clock.hour, clock.minute, clock.second, 0);
  return date;
}

function stableHash(value) {
  let hash = 0;
  for (const char of String(value || '')) {
    hash = ((hash << 5) - hash) + char.charCodeAt(0);
    hash |= 0;
  }
  return Math.abs(hash);
}

function inferSeatCount(busType) {
  const normalized = String(busType || '').toLowerCase();
  if (normalized.includes('2+1') && normalized.includes('sleeper')) {
    return 30;
  }
  if (normalized.includes('sleeper')) {
    return 36;
  }
  if (normalized.includes('seater')) {
    return 44;
  }
  return 40;
}

function loadModel(modelPath = DEFAULT_MODEL_PATH) {
  if (!fs.existsSync(modelPath)) {
    return null;
  }

  return JSON.parse(fs.readFileSync(modelPath, 'utf8'));
}

/**
 * Legacy price estimation using pre-calculated distance
 * Used when actual distance is already known
 */
function estimatePrice(distance, busType, model) {
  const perKm = model?.global?.pricePerKm || 2.8;
  const typeKey = String(busType || '').trim().toLowerCase();
  const multiplier = model?.busTypeMultipliers?.[typeKey] || 1;
  return Math.max(300, Math.round(distance * perKm * multiplier));
}

/**
 * Calculate realistic price using Google Maps real distance
 * Source and destination are city names; this fetches real distance and calculates price
 * @async
 */
async function estimatePriceWithRealDistance(source, destination, busType) {
  try {
    const realDistance = await getRealDistance(source, destination);
    const baseRate = getPriceRateByDistance(realDistance);
    const multiplier = getBusTypeMultiplier(busType);
    const price = Math.max(300, Math.round(realDistance * baseRate * multiplier));
    
    return {
      price,
      distance: realDistance,
      breakdown: {
        baseRate,
        multiplier,
        source,
        destination,
        busType
      }
    };
  } catch (error) {
    console.error(`Error calculating price for ${source} to ${destination}:`, error.message);
    // Fallback to a reasonable estimate
    const fallbackPrice = Math.max(300, Math.round(250 * (busType ? getBusTypeMultiplier(busType) : 1)));
    return {
      price: fallbackPrice,
      distance: 250,
      error: error.message,
      breakdown: { note: 'Fallback price used due to error' }
    };
  }
}

function normalizeCleanedBusRecord(record) {
  const source = normalizeCity(record.Source);
  const destination = normalizeCity(record.Destination);
  const departure = toDate(record['Departure Time'], new Date());
  const arrival = toDate(record['Arrival Time'], new Date(departure.getTime()));
  const durationMinutes = parseDurationMinutes(record['Travel Duration']);
  const seats = Math.max(parseNumber(record['Seats Left'], 0), inferSeatCount(record['Bus Type']));
  const availableSeats = parseNumber(record['Seats Left'], Math.max(8, Math.round(seats * 0.45)));

  return {
    route: `${source} - ${destination}`,
    source,
    destination,
    operator: record.Operator || 'Unknown Operator',
    busType: record['Bus Type'] || 'Standard',
    departure,
    arrival: arrival <= departure && durationMinutes > 0
      ? new Date(departure.getTime() + (durationMinutes * 60 * 1000))
      : arrival,
    durationMinutes,
    seats,
    availableSeats,
    windowSeats: parseNumber(record['Window Seats'], Math.max(4, Math.round(availableSeats * 0.35))),
    price: parseNumber(record.price, 0),
    rating: parseNumber(record.rating, 0),
    distance: parseNumber(record.distance, 0),
    dataSource: 'cleaned_bus',
    location: source
  };
}

function normalizePanIndiaRecord(record, options = {}) {
  const source = normalizeCity(record.From);
  const destination = normalizeCity(record.To);
  const baseDate = options.baseDate ? new Date(options.baseDate) : new Date();
  const durationMinutes = parseDurationMinutes(record.Duration);
  const departure = buildDateFromClock(baseDate, record.Departure);
  const arrival = new Date(departure.getTime() + (durationMinutes * 60 * 1000));
  const busType = record['Bus Type'] || 'Standard';
  const seats = inferSeatCount(busType);
  const hash = stableHash(`${source}-${destination}-${record.Operator}-${busType}`);
  const availableSeats = Math.max(4, Math.min(seats - 1, Math.round(seats * (0.35 + ((hash % 30) / 100)))));
  const windowSeats = Math.max(2, Math.min(availableSeats, Math.round(availableSeats * 0.3)));
  const model = options.model || null;
  const routeKey = `${source}__${destination}`;
  const routeStats = model?.routes?.[routeKey];
  const rating = routeStats?.avgRating || model?.global?.avgRating || 4.1;

  return {
    route: `${source} - ${destination}`,
    source,
    destination,
    operator: record.Operator || 'Unknown Operator',
    busType,
    departure,
    arrival,
    durationMinutes,
    seats,
    availableSeats,
    windowSeats,
    price: routeStats?.avgPrice || estimatePrice(parseNumber(record.Distance, 0), busType, model),
    rating,
    distance: parseNumber(record.Distance, 0),
    dataSource: 'pan_india',
    location: source
  };
}

function readDataset(filePath) {
  return parseCsv(fs.readFileSync(filePath, 'utf8'));
}

function loadTrainingRecords(datasetPaths, options = {}) {
  const cleanedRows = readDataset(datasetPaths.cleanedBusPath);
  const panIndiaRows = readDataset(datasetPaths.panIndiaPath);
  const model = options.model || loadModel(options.modelPath);

  const cleanedRecords = cleanedRows.map(normalizeCleanedBusRecord);
  const panIndiaRecords = panIndiaRows.map((record) => normalizePanIndiaRecord(record, {
    baseDate: options.baseDate,
    model
  }));

  return {
    cleanedRecords,
    panIndiaRecords,
    allRecords: [...cleanedRecords, ...panIndiaRecords]
  };
}

module.exports = {
  DEFAULT_MODEL_PATH,
  estimatePrice,
  estimatePriceWithRealDistance,
  inferSeatCount,
  loadModel,
  loadTrainingRecords,
  normalizeCity,
  parseDurationMinutes,
};
