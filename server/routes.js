// server/routes.js
const express = require('express');
const router = express.Router();
const Product = require('./models/Product');
const Changeover = require('./models/Changeover');
const Order = require('./models/Order');
const { runSchedule, DEFAULT_LATE_WEIGHT } = require('./scheduler');
const { seedDatabase } = require('./seed');

// GET /api/products - list products and allowed lines
router.get('/products', async (req, res) => {
  try {
    const products = await Product.find().sort({ code: 1 });
    res.json(products);
  } catch (err) {
    console.error('Error fetching products:', err);
    res.status(500).json({ error: 'Failed to fetch products', details: err.message });
  }
});

// GET /api/orders - list orders
router.get('/orders', async (req, res) => {
  try {
    const orders = await Order.find().sort({ _id: 1 });
    res.json(orders);
  } catch (err) {
    console.error('Error fetching orders:', err);
    res.status(500).json({ error: 'Failed to fetch orders', details: err.message });
  }
});

// POST /api/orders - add an order (validate product exists, runTime > 0)
router.post('/orders', async (req, res) => {
  try {
    let { code, product, runTime, due } = req.body;

    if (!code || !product || runTime === undefined || due === undefined) {
      return res.status(400).json({
        error: 'Validation failed: code, product, runTime, and due are required.'
      });
    }

    code = String(code).trim().toUpperCase();
    product = String(product).trim().toUpperCase();
    runTime = Number(runTime);
    due = Number(due);

    if (isNaN(runTime) || runTime <= 0) {
      return res.status(400).json({ error: 'Validation failed: runTime must be greater than 0.' });
    }

    if (isNaN(due) || due < 0) {
      return res.status(400).json({ error: 'Validation failed: due must be non-negative.' });
    }

    // Check product exists
    const prodDoc = await Product.findOne({ code: product });
    if (!prodDoc) {
      return res.status(400).json({
        error: `Validation failed: Product "${product}" does not exist in the database.`
      });
    }

    // Check code unique
    const existing = await Order.findOne({ code });
    if (existing) {
      return res.status(409).json({
        error: `Validation failed: Order code "${code}" already exists.`
      });
    }

    const newOrder = await Order.create({ code, product, runTime, due });
    res.status(201).json(newOrder);
  } catch (err) {
    console.error('Error creating order:', err);
    res.status(500).json({ error: 'Failed to create order', details: err.message });
  }
});

// PUT /api/orders/:code - edit an order
router.put('/orders/:code', async (req, res) => {
  try {
    const targetCode = req.params.code.trim().toUpperCase();
    let { product, runTime, due } = req.body;

    const existingOrder = await Order.findOne({ code: targetCode });
    if (!existingOrder) {
      return res.status(404).json({ error: `Order "${targetCode}" not found.` });
    }

    if (product) {
      product = String(product).trim().toUpperCase();
      const prodDoc = await Product.findOne({ code: product });
      if (!prodDoc) {
        return res.status(400).json({
          error: `Validation failed: Product "${product}" does not exist.`
        });
      }
      existingOrder.product = product;
    }

    if (runTime !== undefined) {
      const parsedRunTime = Number(runTime);
      if (isNaN(parsedRunTime) || parsedRunTime <= 0) {
        return res.status(400).json({ error: 'Validation failed: runTime must be > 0.' });
      }
      existingOrder.runTime = parsedRunTime;
    }

    if (due !== undefined) {
      const parsedDue = Number(due);
      if (isNaN(parsedDue) || parsedDue < 0) {
        return res.status(400).json({ error: 'Validation failed: due must be >= 0.' });
      }
      existingOrder.due = parsedDue;
    }

    const updated = await existingOrder.save();
    res.json(updated);
  } catch (err) {
    console.error('Error updating order:', err);
    res.status(500).json({ error: 'Failed to update order', details: err.message });
  }
});

// DELETE /api/orders/:code - remove an order
router.delete('/orders/:code', async (req, res) => {
  try {
    const targetCode = req.params.code.trim().toUpperCase();
    const deleted = await Order.findOneAndDelete({ code: targetCode });
    if (!deleted) {
      return res.status(404).json({ error: `Order "${targetCode}" not found.` });
    }
    res.json({ message: `Order "${targetCode}" deleted successfully`, order: deleted });
  } catch (err) {
    console.error('Error deleting order:', err);
    res.status(500).json({ error: 'Failed to delete order', details: err.message });
  }
});

// POST /api/schedule/run - load data, call runSchedule, return JSON
router.post('/schedule/run', async (req, res) => {
  try {
    const lateWeight = req.body && req.body.lateWeight !== undefined
      ? Number(req.body.lateWeight)
      : DEFAULT_LATE_WEIGHT;

    // Load products
    const products = await Product.find();
    if (products.length === 0) {
      return res.status(400).json({ error: 'No products defined in the database.' });
    }

    // Load changeover matrix
    const changeovers = await Changeover.find();
    const matrix = {};
    for (const p of products) {
      matrix[p.code] = {};
    }
    for (const co of changeovers) {
      if (!matrix[co.from]) matrix[co.from] = {};
      matrix[co.from][co.to] = co.hours;
    }

    // Load orders in arrival order
    const ordersList = await Order.find().sort({ _id: 1 });
    if (ordersList.length === 0) {
      return res.status(400).json({ error: 'No orders available to schedule.' });
    }

    // Allowed lines map
    const allowed = {};
    const linesSet = new Set(['L1', 'L2', 'L3']);
    for (const p of products) {
      allowed[p.code] = p.allowedLines;
      p.allowedLines.forEach((l) => linesSet.add(l));
    }

    // Build context
    const ordersMap = {};
    const orderIds = [];
    for (const o of ordersList) {
      ordersMap[o.code] = {
        code: o.code,
        product: o.product,
        runTime: o.runTime,
        due: o.due,
      };
      orderIds.push(o.code);
    }

    const ctx = {
      lines: Array.from(linesSet).sort(),
      allowed,
      matrix,
      orders: ordersMap,
      orderIds,
      lateWeight: isNaN(lateWeight) ? DEFAULT_LATE_WEIGHT : lateWeight
    };

    const scheduleResults = runSchedule(ctx);

    res.json({
      lateWeight: ctx.lateWeight,
      baseline: scheduleResults.baseline,
      balancedBaseline: scheduleResults.balancedBaseline,
      greedy: scheduleResults.greedy,
      optimized: scheduleResults.optimized,
      lateOrders: scheduleResults.lateOrders,
      impossibleOrders: scheduleResults.impossibleOrders,
      validation: scheduleResults.validation,
      productDetails: products.reduce((acc, p) => {
        acc[p.code] = { name: p.name, family: p.family, allowedLines: p.allowedLines };
        return acc;
      }, {})
    });
  } catch (err) {
    console.error('Error running schedule:', err);
    res.status(500).json({ error: 'Failed to run scheduler', details: err.message });
  }
});

// POST /api/reset - resets orders & data to seed defaults
router.post('/reset', async (req, res) => {
  try {
    await seedDatabase(false);
    res.json({ message: 'Database reset to default seed data successfully.' });
  } catch (err) {
    console.error('Error resetting database:', err);
    res.status(500).json({ error: 'Failed to reset database', details: err.message });
  }
});

module.exports = router;
