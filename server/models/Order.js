const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },
    product: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    runTime: {
      type: Number,
      required: true,
      min: [0.1, 'Run time must be greater than 0'],
    },
    due: {
      type: Number,
      required: true,
      min: [0, 'Due time must be non-negative'],
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Order', orderSchema);
