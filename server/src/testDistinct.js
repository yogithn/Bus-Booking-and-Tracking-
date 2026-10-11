const mongoose = require('mongoose');
const Bus = require('./models/Bus');
const dotenv = require('dotenv');

dotenv.config({ path: './.env' });

async function run() {
  try {
    await mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
    const count = await Bus.countDocuments();
    const first = await Bus.findOne({}).lean();
    const values = await Bus.distinct('source', { source: { $regex: '^Bangalore', $options: 'i' } });
    console.log('count:', count);
    console.log('first:', first ? { source: first.source, destination: first.destination } : null);
    console.log('values:', values);
    console.log('len:', values.length);
    await mongoose.disconnect();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
