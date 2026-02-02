const mongoose = require('mongoose');

const topicSchema = new mongoose.Schema({
  examId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Exam',
    required: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  parentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Topic',
    default: null,
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

topicSchema.index({ examId: 1, parentId: 1, order: 1 });

topicSchema.index({ examId: 1, name: 1 });

module.exports = mongoose.model('Topic', topicSchema);
