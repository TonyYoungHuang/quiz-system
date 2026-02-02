const mongoose = require('mongoose');

const paperSchema = new mongoose.Schema({
  examId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Exam',
    required: true,
    index: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  year: {
    type: Number,
    required: true,
    index: true
  },
  order: {
    type: Number,
    default: 0
  },
  meta: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, { timestamps: true });

paperSchema.index({ examId: 1, year: -1, order: 1 });

module.exports = mongoose.model('Paper', paperSchema);
