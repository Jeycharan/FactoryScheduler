const mongoose = require('mongoose');

const changeoverSchema = new mongoose.Schema(
  {
    from: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    to: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    hours: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { timestamps: true }
);

changeoverSchema.index({ from: 1, to: 1 }, { unique: true });

module.exports = mongoose.model('Changeover', changeoverSchema);
