const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Bus = require('../src/models/Bus');
const { loadTrainingRecords, DEFAULT_MODEL_PATH } = require('../src/utils/busData');
const { resetModelCache, scoreBusSearchResult } = require('../src/services/busSearchModel');

dotenv.config();

const DEFAULT_CLEANED_PATH = 'C:\\Users\\nyogi\\Downloads\\cleaned_bus.csv.csv';
const DEFAULT_PAN_INDIA_PATH = 'C:\\Users\\nyogi\\Downloads\\Pan-India_Bus_Routes.csv';

function getArgValue(flag, fallback) {
  const index = process.argv.indexOf(flag);
  return index >= 0 ? process.argv[index + 1] : fallback;
}

function hasFlag(flag) {
  return process.argv.includes(flag);
}

async function main() {
  const cleanedBusPath = getArgValue('--cleaned', DEFAULT_CLEANED_PATH);
  const panIndiaPath = getArgValue('--panindia', DEFAULT_PAN_INDIA_PATH);
  const baseDate = getArgValue('--base-date', '2026-04-10T00:00:00.000Z');
  const modelPath = getArgValue('--model', DEFAULT_MODEL_PATH);
  const dryRun = hasFlag('--dry-run');
  process.env.BUS_SEARCH_MODEL_PATH = modelPath;

  const { allRecords } = loadTrainingRecords({
    cleanedBusPath,
    panIndiaPath
  }, {
    baseDate,
    modelPath
  });

  resetModelCache();
  const docs = allRecords.map((record) => ({
    ...record,
    searchScore: scoreBusSearchResult(record)
  }));

  if (dryRun) {
    console.log(JSON.stringify({
      dryRun: true,
      totalRecords: docs.length,
      sample: docs.slice(0, 3)
    }, null, 2));
    return;
  }

  if (!process.env.MONGO_URI) {
    throw new Error('MONGO_URI is required to import dataset records into MongoDB.');
  }

  await mongoose.connect(process.env.MONGO_URI);
  await Bus.deleteMany({});
  await Bus.insertMany(docs, { ordered: false });

  console.log(JSON.stringify({
    dryRun: false,
    totalRecords: docs.length
  }, null, 2));

  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error(error.message);
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  process.exit(1);
});
