const mongoose = require('mongoose');

/**
 * 题目表
 * 支持单选、多选、判断三种题型
 */
const questionSchema = new mongoose.Schema({
  // 关联的科目 ID
  examId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Exam',
    required: [true, '必须关联一个科目'],
    index: true
  },
  // 题型：SINGLE(单选) / MULTI(多选) / JUDGE(判断)
  type: {
    type: String,
    enum: ['SINGLE', 'MULTI', 'JUDGE'],
    required: [true, '题型不能为空']
  },
  // 题干内容
  content: {
    type: String,
    required: [true, '题干内容不能为空'],
    trim: true
  },
  // 选项列表（判断题只有 A/B 两个选项）
  options: [{
    key: {
      type: String,      // A, B, C, D
      required: true
    },
    value: {
      type: String,      // 选项内容
      required: true
    }
  }],
  // 正确答案（单选/判断为字符串，多选为数组）
  answer: {
    type: mongoose.Schema.Types.Mixed,
    required: [true, '答案不能为空']
  },
  // 答案解析
  explanation: {
    type: String,
    default: ''
  },
  // 预留：图片或音频 URL
  mediaUrl: {
    type: String,
    default: ''
  },
  // 难度等级：1-5
  difficulty: {
    type: Number,
    min: 1,
    max: 5,
    default: 3
  },
  // 标签（用于分类筛选）
  tags: [{
    type: String,
    trim: true
  }],
  // 排序
  sortOrder: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// 索引优化
questionSchema.index({ examId: 1, sortOrder: 1 });
questionSchema.index({ examId: 1, type: 1 });

// 验证答案格式
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
