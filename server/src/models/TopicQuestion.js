const mongoose = require('mongoose');

const topicQuestionSchema = new mongoose.Schema({
  topicId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Topic',
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

topicQuestionSchema.index({ topicId: 1, questionId: 1 }, { unique: true });

module.exports = mongoose.model('TopicQuestion', topicQuestionSchema);
