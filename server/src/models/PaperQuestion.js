const mongoose = require('mongoose');

const paperQuestionSchema = new mongoose.Schema({
  paperId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Paper',
    required: true,
    index: true
  },
  questionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Question',
    required: true,
    index: true
  },
  order: {
    type: Number,
    default: 0
  }
}, { timestamps: true });

paperQuestionSchema.index({ paperId: 1, questionId: 1 }, { unique: true });

module.exports = mongoose.model('PaperQuestion', paperQuestionSchema);
