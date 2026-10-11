const fs = require('fs');
const path = require('path');
const { loadTrainingRecords, DEFAULT_MODEL_PATH } = require('../src/utils/busData');

const DEFAULT_CLEANED_PATH = 'C:\\Users\\nyogi\\Downloads\\cleaned_bus.csv.csv';
const DEFAULT_PAN_INDIA_PATH = 'C:\\Users\\nyogi\\Downloads\\Pan-India_Bus_Routes.csv';

function getArgValue(flag, fallback) {
  const index = process.argv.indexOf(flag);
  return index >= 0 ? process.argv[index + 1] : fallback;
}

function hasFlag(flag) {
  return process.argv.includes(flag);
}

function buildAverage(values) {
  if (!values.length) {
    return 0;
  }
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function round(value, digits = 2) {
  return Number(value.toFixed(digits));
}

function trainModel(records) {
  const routes = {};
  const busTypeAgg = {};

  for (const record of records) {
    const key = `${record.source.toLowerCase()}__${record.destination.toLowerCase()}`;
    routes[key] ||= {
      frequency: 0,
      prices: [],
      durations: [],
      ratings: [],
      distances: []
    };

    routes[key].frequency += 1;
    if (record.price > 0) {
      routes[key].prices.push(record.price);
    }
    if (record.durationMinutes > 0) {
      routes[key].durations.push(record.durationMinutes);
    }
    if (record.rating > 0) {
      routes[key].ratings.push(record.rating);
    }
    if (record.distance > 0) {
      routes[key].distances.push(record.distance);
    }

    const typeKey = String(record.busType || '').trim().toLowerCase();
    if (typeKey && record.price > 0 && record.distance > 0) {
      busTypeAgg[typeKey] ||= [];
      busTypeAgg[typeKey].push(record.price / record.distance);
    }
  }

  const cleanedPriceRecords = records.filter((record) => record.price > 0 && record.distance > 0);
  const globalPricePerKm = buildAverage(cleanedPriceRecords.map((record) => record.price / record.distance)) || 2.8;
  const globalAvgPrice = buildAverage(cleanedPriceRecords.map((record) => record.price)) || 1200;
  const globalAvgDuration = buildAverage(records.filter((record) => record.durationMinutes > 0).map((record) => record.durationMinutes)) || 360;
  const globalAvgRating = buildAverage(records.filter((record) => record.rating > 0).map((record) => record.rating)) || 4.1;

  const serializedRoutes = Object.entries(routes).reduce((accumulator, [key, stats]) => {
    accumulator[key] = {
      frequency: stats.frequency,
      avgPrice: round(buildAverage(stats.prices) || (buildAverage(stats.distances) * globalPricePerKm) || globalAvgPrice),
      avgDurationMinutes: round(buildAverage(stats.durations) || globalAvgDuration),
      avgRating: round(buildAverage(stats.ratings) || globalAvgRating),
      avgDistance: round(buildAverage(stats.distances) || 0)
    };
    return accumulator;
  }, {});

  const maxRouteFrequency = Math.max(...Object.values(serializedRoutes).map((route) => route.frequency), 1);
  const busTypeMultipliers = Object.entries(busTypeAgg).reduce((accumulator, [typeKey, values]) => {
    accumulator[typeKey] = round(buildAverage(values) / globalPricePerKm);
    return accumulator;
  }, {});

  return {
    generatedAt: new Date().toISOString(),
    datasetSummary: {
      totalRecords: records.length,
      totalRoutes: Object.keys(serializedRoutes).length
    },
    global: {
      avgPrice: round(globalAvgPrice),
      avgDurationMinutes: round(globalAvgDuration),
      avgRating: round(globalAvgRating),
      pricePerKm: round(globalPricePerKm),
      maxRouteFrequency
    },
    routes: serializedRoutes,
    busTypeMultipliers
  };
}

function main() {
  const cleanedBusPath = getArgValue('--cleaned', DEFAULT_CLEANED_PATH);
  const panIndiaPath = getArgValue('--panindia', DEFAULT_PAN_INDIA_PATH);
  const outputPath = getArgValue('--out', DEFAULT_MODEL_PATH);
  const baseDate = getArgValue('--base-date', '2026-04-10T00:00:00.000Z');
  const dryRun = hasFlag('--dry-run');

  const { allRecords } = loadTrainingRecords({
    cleanedBusPath,
    panIndiaPath
  }, { baseDate });

  const model = trainModel(allRecords);

  if (!dryRun) {
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, `${JSON.stringify(model, null, 2)}\n`);
  }

  console.log(JSON.stringify({
    outputPath,
    dryRun,
    ...model.datasetSummary,
    generatedAt: model.generatedAt
  }, null, 2));
}

main();
