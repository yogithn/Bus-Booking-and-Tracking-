const fs = require('fs');
const path = require('path');

let cachedModel = null;

function getModelPath() {
  return process.env.BUS_SEARCH_MODEL_PATH || path.join(__dirname, '..', 'data', 'bus-search-model.json');
}

function normalizeKeyPart(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function routeKey(from, to) {
  return `${normalizeKeyPart(from)}__${normalizeKeyPart(to)}`;
}

function loadSearchModel() {
  if (cachedModel) {
    return cachedModel;
  }

  const modelPath = getModelPath();

  if (!fs.existsSync(modelPath)) {
    cachedModel = { routes: {}, global: {}, busTypeMultipliers: {} };
    return cachedModel;
  }

  cachedModel = JSON.parse(fs.readFileSync(modelPath, 'utf8'));
  return cachedModel;
}

function getRouteInsights(from, to) {
  const model = loadSearchModel();
  return model.routes[routeKey(from, to)] || null;
}

function scoreBusSearchResult(bus) {
  const model = loadSearchModel();
  const insights = getRouteInsights(bus.source, bus.destination) || {};
  const global = model.global || {};
  const avgPrice = insights.avgPrice || global.avgPrice || bus.price || 1;
  const avgDuration = insights.avgDurationMinutes || global.avgDurationMinutes || bus.durationMinutes || 1;
  const avgRating = insights.avgRating || global.avgRating || 4;
  const popularity = insights.frequency || 1;

  const priceScore = 35 * Math.max(0, Math.min(1.5, avgPrice / Math.max(bus.price || avgPrice, 1)));
  const seatScore = 20 * Math.max(0, Math.min(1, (bus.availableSeats || 0) / Math.max(bus.seats || 1, 1)));
  const ratingScore = 25 * Math.max(0, Math.min(1.25, (bus.rating || avgRating) / Math.max(avgRating, 1)));
  const durationScore = 15 * Math.max(0, Math.min(1.5, avgDuration / Math.max(bus.durationMinutes || avgDuration, 1)));
  const demandScore = 5 * Math.min(1, popularity / Math.max(global.maxRouteFrequency || 1, 1));

  return Number((priceScore + seatScore + ratingScore + durationScore + demandScore).toFixed(2));
}

function resetModelCache() {
  cachedModel = null;
}

module.exports = {
  getRouteInsights,
  loadSearchModel,
  resetModelCache,
  scoreBusSearchResult,
};
