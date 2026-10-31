// server/seed.js
const mongoose = require('mongoose');
const Product = require('./models/Product');
const Changeover = require('./models/Changeover');
const Order = require('./models/Order');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/factory_scheduler';

const productsData = [
  { code: 'P1', name: 'Latex Glove', family: 'latex', allowedLines: ['L1', 'L2'] },
  { code: 'P2', name: 'Latex Balloon', family: 'latex', allowedLines: ['L1'] },
  { code: 'P3', name: 'Nitrile Glove', family: 'nonlatex', allowedLines: ['L1', 'L2', 'L3'] },
  { code: 'P4', name: 'Vinyl Glove', family: 'nonlatex', allowedLines: ['L2', 'L3'] },
  { code: 'P5', name: 'Silicone Seal', family: 'nonlatex', allowedLines: ['L2', 'L3'] },
  { code: 'P6', name: 'Foam Pad', family: 'nonlatex', allowedLines: ['L1', 'L3'] },
  { code: 'P7', name: 'Latex Band', family: 'latex', allowedLines: ['L1', 'L3'] },
];

const matrixData = {
  P1: { P1: 0, P2: 0.5, P3: 2, P4: 2, P5: 2, P6: 2, P7: 0.5 },
  P2: { P1: 0.5, P2: 0, P3: 2, P4: 2, P5: 2, P6: 2, P7: 0.5 },
  P3: { P1: 1, P2: 1, P3: 0, P4: 0.5, P5: 0.5, P6: 0.5, P7: 1 },
  P4: { P1: 1, P2: 1, P3: 0.5, P4: 0, P5: 0.5, P6: 0.5, P7: 1 },
  P5: { P1: 1, P2: 1, P3: 0.5, P4: 0.5, P5: 0, P6: 0.5, P7: 1 },
  P6: { P1: 1, P2: 1, P3: 0.5, P4: 0.5, P5: 0.5, P6: 0, P7: 1 },
  P7: { P1: 0.5, P2: 0.5, P3: 2, P4: 2, P5: 2, P6: 2, P7: 0 },
};

const ordersData = [
  { code: 'O1',  product: 'P1', runTime: 6,  due: 12 },
  { code: 'O2',  product: 'P1', runTime: 8,  due: 30 },
  { code: 'O3',  product: 'P2', runTime: 10, due: 20 },
  { code: 'O4',  product: 'P2', runTime: 8,  due: 40 },
  { code: 'O5',  product: 'P3', runTime: 6,  due: 16 },
  { code: 'O6',  product: 'P3', runTime: 5,  due: 36 },
  { code: 'O7',  product: 'P4', runTime: 7,  due: 14 },
  { code: 'O8',  product: 'P5', runTime: 6,  due: 24 },
  { code: 'O9',  product: 'P6', runTime: 8,  due: 28 },
  { code: 'O10', product: 'P7', runTime: 5,  due: 18 },
  { code: 'O11', product: 'P4', runTime: 6,  due: 44 },
  { code: 'O12', product: 'P2', runTime: 12, due: 10 },
];

async function seedDatabase(disconnectAfter = true) {
  try {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(MONGODB_URI);
      console.log(`Connected to MongoDB at ${MONGODB_URI}`);
    }

    console.log('Clearing existing database collections...');
    await Product.deleteMany({});
    await Changeover.deleteMany({});
    await Order.deleteMany({});

    console.log('Seeding products...');
    await Product.insertMany(productsData);

    console.log('Seeding changeover matrix...');
    const changeoverDocs = [];
    for (const [from, toMap] of Object.entries(matrixData)) {
      for (const [to, hours] of Object.entries(toMap)) {
        changeoverDocs.push({ from, to, hours });
      }
    }
    await Changeover.insertMany(changeoverDocs);

    console.log('Seeding orders...');
    await Order.insertMany(ordersData);

    console.log(`Successfully seeded:
  - ${productsData.length} products
  - ${changeoverDocs.length} changeover transitions
  - ${ordersData.length} orders`);

    if (disconnectAfter) {
      await mongoose.disconnect();
      console.log('Disconnected from MongoDB.');
    }
    return { success: true };
  } catch (err) {
    console.error('Error seeding database:', err);
    if (disconnectAfter && mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    throw err;
  }
}

if (require.main === module) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = { seedDatabase, productsData, matrixData, ordersData };
