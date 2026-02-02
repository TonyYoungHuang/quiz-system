const mongoose = require('mongoose');

const importTaskSchema = new mongoose.Schema({
  examId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Exam',
    required: false,
    index: true
  },
  status: {
    type: String,
    enum: [
      'uploaded',
      'extracted',
      'parsed',
      'validated',
      'validation_failed',
      'ready',
      'committed',
      'failed'
    ],
    default: 'uploaded',
    index: true
  },
  source: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  rawText: { type: String, default: '' },
  extractedText: { type: String, default: '' },
  parsedQuestions: {
    type: Array,
    default: []
  },
  validation: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  result: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, { timestamps: true });

module.exports = mongoose.model('ImportTask', importTaskSchema);
