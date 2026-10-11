const express = require('express');
const mongoose = require('mongoose');
const Bus = require('../models/Bus');
const { scoreBusSearchResult, getRouteInsights, loadSearchModel } = require('../services/busSearchModel');
const { buildTripSnapshot, generateTrackingId, getTrackingOverview, getScheduleForDate } = require('../services/busTrackingService');
const { generateSyntheticRouteBuses } = require('../services/syntheticRouteService');
const { validateAndCorrectDuration, formatDuration } = require('../services/routeDurationService');
const { getTimePeriodFromDeparture, getTimePeriodStats } = require('../services/timeBasedAllocationService');
const { getAllTimeSlots, formatTimePeriod, getSeatsAllocationByPeriod } = require('../utils/timeSlotUtils');
const { normalizeCity, inferSeatCount, estimatePrice } = require('../utils/busData');
const { CITY_COORDINATES, ALIAS_MAP, normalizeCityName } = require('../services/locationService');

const router = express.Router();

function parseLocalDate(value) {
  if (!value) return null;
  const parts = String(value).split('-').map((part) => Number(part));
  if (parts.length !== 3 || parts.some((part) => !Number.isFinite(part))) {
    return null;
  }
  return new Date(parts[0], parts[1] - 1, parts[2]);
}

function escapeRegex(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function comparableCityKey(value) {
  const normalized = normalizeCityName(value);
  return ALIAS_MAP[normalized] || normalized;
}

function formatCityLabel(value) {
  const normalized = String(value || '').trim();

  if (!normalized) {
    return '';
  }

  const specialLabels = {
    bangaloreintlairport: 'Bangalore Intl Airport',
    bcroad: 'BC Road',
    delhiairport: 'Delhi Airport',
    mountabu: 'Mount Abu'
  };
  const cityKey = normalizeCityName(normalized);

  if (specialLabels[cityKey]) {
    return specialLabels[cityKey];
  }

  return normalized
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

function getFallbackSuggestions({ q = '', field = 'source', limit = 8, from = '' }) {
  const model = loadSearchModel();
  const routeKeys = Object.keys(model.routes || {});
  const normalizedQuery = normalizeCityName(q);
  const normalizedFrom = comparableCityKey(from);
  const candidates = new Set(Object.keys(CITY_COORDINATES || {}));

  const validDestinations = new Set();
  if (field === 'destination' && normalizedFrom) {
    routeKeys.forEach((key) => {
      const [source, destination] = key.split('__');

      if (!source || !destination) {
        return;
      }

      if (comparableCityKey(source) === normalizedFrom) {
        validDestinations.add(comparableCityKey(destination));
      }
    });

    if (validDestinations.size === 0) {
      return [];
    }
  }

  routeKeys.forEach((key) => {
    const [source, destination] = key.split('__');

    if (!source || !destination) {
      return;
    }

    candidates.add(source);
    candidates.add(destination);

    if (field === 'destination' && normalizedFrom && comparableCityKey(source) === normalizedFrom) {
      candidates.add(destination);
    }
  });

  const filtered = Array.from(candidates).filter((city) => {
    if (field === 'destination' && normalizedFrom) {
      if (!validDestinations.has(comparableCityKey(city))) {
        return false;
      }
    }

    return !normalizedQuery || normalizeCityName(city).startsWith(normalizedQuery);
  });

  const uniqueLabels = Array.from(new Set(filtered.map(formatCityLabel).filter(Boolean)));

  return uniqueLabels
    .sort((left, right) => left.localeCompare(right))
    .slice(0, Number(limit));
}

function normalizeTrackingLookup(value) {
  return String(value || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function parseSyntheticBusId(value) {
  const match = String(value || '').trim().match(/^synthetic-(.+)-(.+)-(\d+)$/i);

  if (!match) {
    return null;
  }

  return {
    source: normalizeCity(match[1]),
    destination: normalizeCity(match[2]),
    index: Number(match[3]) || 1
  };
}

function buildSyntheticBusForTracking(value) {
  const parsed = parseSyntheticBusId(value);

  if (!parsed) {
    return null;
  }

  const routeInsights = getRouteInsights(parsed.source, parsed.destination);
  const distance = Number(routeInsights?.avgDistance) || 0;
  const durationMinutes = Number(routeInsights?.avgDurationMinutes)
    || (distance > 0 ? Math.max(90, Math.round((distance / 45) * 60)) : 180);
  const busTypes = [
    'A/C Sleeper (2+1)',
    'A/C Seater (2+2)',
    'Non A/C Seater / Sleeper (2+1)',
    'Electric A/C Seater (2+2)'
  ];
  const slotIndex = Math.max(0, parsed.index - 1);
  const departure = new Date();
  departure.setHours((6 + (slotIndex * 2)) % 24, slotIndex % 2 === 0 ? 0 : 30, 0, 0);

  const busType = busTypes[slotIndex % busTypes.length];
  const seats = inferSeatCount(busType);

  return {
    _id: String(value).trim(),
    route: `${parsed.source} - ${parsed.destination}`,
    source: parsed.source,
    destination: parsed.destination,
    operator: `${parsed.source} Express`,
    busType,
    departure,
    arrival: new Date(departure.getTime() + (durationMinutes * 60 * 1000)),
    durationMinutes,
    seats,
    availableSeats: Math.max(4, Math.round(seats * 0.55)),
    price: Number(routeInsights?.avgPrice) || estimatePrice(distance || 180, busType),
    rating: Number(routeInsights?.avgRating) || 4.2,
    distance,
    searchScore: 0,
    dataSource: 'synthetic_model',
    synthetic: true
  };
}

async function findBusForTracking(value) {
  const rawValue = String(value || '').trim();
  const syntheticBus = buildSyntheticBusForTracking(rawValue);

  if (syntheticBus) {
    return syntheticBus;
  }

  if (mongoose.Types.ObjectId.isValid(rawValue)) {
    const bus = await Bus.findById(rawValue).lean();
    if (bus) {
      return bus;
    }
  }

  const lookup = normalizeTrackingLookup(rawValue);
  const suffix = lookup.startsWith('TRK') ? lookup.slice(3) : lookup;

  if (!suffix) {
    return null;
  }

  const buses = await Bus.find({}, {
    route: 1,
    source: 1,
    destination: 1,
    operator: 1,
    busType: 1,
    departure: 1,
    arrival: 1,
    durationMinutes: 1,
    seats: 1,
    availableSeats: 1,
    price: 1,
    rating: 1,
    distance: 1,
    searchScore: 1,
  }).lean();

  return buses.find((bus) => generateTrackingId(bus._id).replace(/[^A-Z0-9]/g, '').endsWith(suffix)) || null;
}

// Search buses
router.get('/search', async (req, res) => {
  const { from, to, date } = req.query;
  try {
    const selectedDate = date ? parseLocalDate(date) || new Date(date) : new Date();
    const now = new Date();
    const normalizedFrom = (from || '').trim();
    const normalizedTo = (to || '').trim();
    const escapedFrom = escapeRegex(normalizedFrom);
    const escapedTo = escapeRegex(normalizedTo);

    const query = {};

    if (normalizedFrom && normalizedTo) {
      query.$or = [
        {
          source: { $regex: `^${escapedFrom}$`, $options: 'i' },
          destination: { $regex: `^${escapedTo}$`, $options: 'i' }
        },
        {
          route: { $regex: `${escapedFrom}.*${escapedTo}`, $options: 'i' }
        }
      ];
    }

    const buses = await Bus.find(query).lean();
    const sameDayAsToday = selectedDate.toDateString() === now.toDateString();
    
    // Validate and correct durations for all buses
    const busesWithCorrectedDuration = await Promise.all(
      buses.map(bus => validateAndCorrectDuration(bus))
    );

    let rankedBuses = busesWithCorrectedDuration
      .map((bus) => ({
        ...bus,
        durationDisplay: formatDuration(bus.durationMinutes),
        ...getScheduleForDate(bus, selectedDate),
        inferredSearchScore: scoreBusSearchResult(bus)
      }))
      .filter((bus) => {
        if (!date) {
          return bus.departure >= now;
        }

        if (sameDayAsToday) {
          return bus.departure >= now;
        }

        return true;
      })
      .sort((left, right) => right.inferredSearchScore - left.inferredSearchScore);

    if (rankedBuses.length === 0 && normalizedFrom && normalizedTo) {
      const [sourceTemplates, destinationTemplates] = await Promise.all([
        Bus.find({ source: { $regex: `^${normalizedFrom}$`, $options: 'i' } }).limit(12).lean(),
        Bus.find({ destination: { $regex: `^${normalizedTo}$`, $options: 'i' } }).limit(12).lean()
      ]);

      rankedBuses = await generateSyntheticRouteBuses({
        from: normalizedFrom,
        to: normalizedTo,
        selectedDate,
        sourceTemplates,
        destinationTemplates
      });
    }

    res.json(rankedBuses);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/insights/:from/:to', async (req, res) => {
  try {
    const insights = getRouteInsights(req.params.from, req.params.to);
    res.json(insights);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/suggestions', async (req, res) => {
  try {
    const { q = '', field = 'source', limit = 8, from = '' } = req.query;
    const normalizedField = field === 'destination' ? 'destination' : 'source';
    const normalizedQuery = String(q).trim();
    const normalizedFrom = String(from).trim();
    const escapedQuery = escapeRegex(normalizedQuery);
    const escapedFrom = escapeRegex(normalizedFrom);

    const match = {};

    if (normalizedField === 'destination' && normalizedFrom) {
      match.source = { $regex: `^${escapedFrom}$`, $options: 'i' };
    }

    if (normalizedQuery) {
      match[normalizedField] = { $regex: `^${escapedQuery}`, $options: 'i' };
    }

    let values = [];

    try {
      values = await Bus.distinct(normalizedField, match);
      values = Array.from(new Set(values || []))
        .filter(Boolean)
        .sort((left, right) => left.localeCompare(right))
        .slice(0, Number(limit));
    } catch (queryError) {
      values = [];
    }

    if (values.length > 0) {
      return res.json(values);
    }

    return res.json(getFallbackSuggestions({
      q: normalizedQuery,
      field: normalizedField,
      limit,
      from: normalizedFrom
    }));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

async function sendTrackingOverview(req, res) {
  try {
    const { limit = 10, incomingWindowMinutes = 180 } = req.query;
    const buses = await Bus.find({}).lean();
    const overview = getTrackingOverview(buses, {
      limit,
      incomingWindowMinutes
    });

    res.json(overview);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

async function sendTrackingSnapshot(req, res) {
  try {
    const bus = await findBusForTracking(req.params.id);

    if (!bus) {
      return res.status(404).json({ message: 'Bus not found' });
    }

    const snapshot = buildTripSnapshot(bus);
    return res.json(snapshot);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
}

router.get('/tracking/overview', sendTrackingOverview);
router.get('/tracking/track/:id', sendTrackingSnapshot);

// Get bus by id
router.get('/:id', async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(404).json({ message: 'Bus not found' });
  }

  try {
    const bus = await Bus.findById(req.params.id);
    if (!bus) {
      return res.status(404).json({ message: 'Bus not found' });
    }

    // Validate and correct duration
    const busWithCorrectedDuration = await validateAndCorrectDuration(bus.toObject());
    const busWithDisplay = {
      ...busWithCorrectedDuration,
      durationDisplay: formatDuration(busWithCorrectedDuration.durationMinutes)
    };

    res.json(busWithDisplay);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get available time periods for a route
router.get('/schedule/time-periods', async (req, res) => {
  try {
    const { from, to, date } = req.query;
    
    if (!from || !to || !date) {
      return res.status(400).json({ 
        message: 'Missing required parameters: from, to, date' 
      });
    }

    const selectedDate = new Date(date);
    const stats = await getTimePeriodStats(from, to, selectedDate);

    const timePeriods = getAllTimeSlots();
    const response = Object.keys(timePeriods).map(period => ({
      period,
      displayName: formatTimePeriod(period),
      ...timePeriods[period],
      availableBuses: stats[period].buses,
      totalSeats: stats[period].totalSeats,
      availableSeats: stats[period].availableSeats,
      occupancyRate: stats[period].totalSeats > 0 
        ? (1 - (stats[period].availableSeats / stats[period].totalSeats)).toFixed(2)
        : 0
    }));

    res.json(response);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get buses by time period
router.get('/by-period/:timePeriod', async (req, res) => {
  try {
    const { timePeriod } = req.params;
    const { from, to, date } = req.query;
    const validPeriods = ['morning', 'afternoon', 'evening', 'night'];

    if (!validPeriods.includes(timePeriod)) {
      return res.status(400).json({ 
        message: `Invalid time period. Must be one of: ${validPeriods.join(', ')}` 
      });
    }

    const query = { timePeriod };

    if (from && to) {
      query.$or = [
        {
          source: { $regex: `^${from}$`, $options: 'i' },
          destination: { $regex: `^${to}$`, $options: 'i' }
        },
        {
          route: { $regex: `${from}.*${to}`, $options: 'i' }
        }
      ];
    }

    if (date) {
      const selectedDate = new Date(date);
      const dayStart = new Date(selectedDate.setHours(0, 0, 0, 0));
      const dayEnd = new Date(new Date(date).setHours(23, 59, 59, 999));
      query.departure = { $gte: dayStart, $lte: dayEnd };
    }

    const buses = await Bus.find(query).lean();

    const result = buses.map(bus => ({
      ...bus,
      durationDisplay: formatDuration(bus.durationMinutes),
      timePeriodDisplay: formatTimePeriod(bus.timePeriod),
      pricePerSeat: bus.price
    }));

    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get time period statistics for a route
router.get('/schedule/stats', async (req, res) => {
  try {
    const { from, to, date } = req.query;

    if (!from || !to || !date) {
      return res.status(400).json({ 
        message: 'Missing required parameters: from, to, date' 
      });
    }

    const selectedDate = new Date(date);
    const stats = await getTimePeriodStats(from, to, selectedDate);

    res.json({
      route: `${from} → ${to}`,
      date: selectedDate.toISOString().split('T')[0],
      timePeriodStats: stats,
      summary: {
        totalBuses: Object.values(stats).reduce((sum, p) => sum + p.buses, 0),
        totalSeats: Object.values(stats).reduce((sum, p) => sum + p.totalSeats, 0),
        totalAvailable: Object.values(stats).reduce((sum, p) => sum + p.availableSeats, 0)
      }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
