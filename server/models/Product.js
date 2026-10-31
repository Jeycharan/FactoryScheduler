const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    family: {
      type: String,
      required: true,
      enum: ['latex', 'nonlatex'],
    },
    allowedLines: {
      type: [String],
      required: true,
      validate: {
        validator: (v) => Array.isArray(v) && v.length > 0,
        message: 'A product must have at least one allowed line',
      },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Product', productSchema);
