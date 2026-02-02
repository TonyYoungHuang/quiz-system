const mongoose = require('mongoose');

const blockSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['text', 'image', 'formula', 'table'],
    required: true
  },
  content: {
    zh: { type: String }
  },
  url: { type: String },
  alt: { type: String, default: '' },
  latex: { type: String },
  rows: [[String]]
}, { _id: false });

const optionSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true
  },
  value: {
    type: String
  },
  content: {
    type: [blockSchema],
    default: undefined
  }
}, { _id: false });

optionSchema.path('value').validate(function(value) {
  return !!value || (Array.isArray(this.content) && this.content.length > 0);
}, 'Option requires value or content blocks');

const childQuestionSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['SINGLE', 'MULTI', 'JUDGE', 'BLANK', 'SHORT', 'CALC'],
    required: true
  },
  stem: {
    type: [blockSchema],
    default: undefined
  },
  options: {
    type: [optionSchema],
    default: undefined
  },
  answer: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  analysis: {
    type: [blockSchema],
    default: undefined
  }
}, { _id: false });

const questionSchema = new mongoose.Schema({
  examId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Exam',
    required: [true, 'examId is required'],
    index: true
  },
  type: {
    type: String,
    enum: ['SINGLE', 'MULTI', 'JUDGE', 'BLANK', 'SHORT', 'CASE', 'CALC'],
    required: [true, 'type is required']
  },
  // legacy plain text content
  content: {
    type: String,
    trim: true
  },
  // blocks-based stem
  stem: {
    type: [blockSchema],
    default: undefined
  },
  // options (legacy value + new content blocks)
  options: {
    type: [optionSchema],
    default: undefined
  },
  answer: {
    type: mongoose.Schema.Types.Mixed,
    required: [true, 'answer is required']
  },
  // legacy plain text explanation
  explanation: {
    type: String,
    default: ''
  },
  analysis: {
    type: [blockSchema],
    default: undefined
  },
  // legacy single media url
  mediaUrl: {
    type: String,
    default: ''
  },
  // new media array
  media: {
    type: [{
      type: {
        type: String,
        enum: ['image', 'audio', 'video'],
        required: true
      },
      url: {
        type: String,
        required: true
      },
      desc: {
        type: String,
        default: ''
      }
    }],
    default: undefined
  },
  // case questions
  children: {
    type: [childQuestionSchema],
    default: undefined
  },
  difficulty: {
    type: Number,
    min: 1,
    max: 5,
    default: 3
  },
  tags: [{
    type: String,
    trim: true
  }],
  sortOrder: {
    type: Number,
    default: 0
  },
  meta: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

questionSchema.index({ examId: 1, sortOrder: 1 });
questionSchema.index({ examId: 1, type: 1 });

questionSchema.pre('validate', function(next) {
  const hasStem = Array.isArray(this.stem) && this.stem.length > 0;
  const hasContent = typeof this.content === 'string' && this.content.trim().length > 0;
  if (!hasStem && !hasContent) {
    return next(new Error('content or stem is required'));
  }
  next();
});

questionSchema.pre('save', function(next) {
  if (this.type === 'MULTI' && !Array.isArray(this.answer)) {
    this.answer = [this.answer];
  }
  if ((this.type === 'SINGLE' || this.type === 'JUDGE') && Array.isArray(this.answer)) {
    this.answer = this.answer[0];
  }
  next();
});

module.exports = mongoose.model('Question', questionSchema);
