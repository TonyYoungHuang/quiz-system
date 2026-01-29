const mongoose = require('mongoose');

/**
 * 考试科目表
 * 支持后台动态增删科目，前端自动加载
 */
const examSchema = new mongoose.Schema({
  // 科目名称
  name: {
    type: String,
    required: [true, '科目名称不能为空'],
    trim: true,
    maxlength: [100, '科目名称最多100个字符']
  },
  // 分类（英语/音乐/专业课等）
  category: {
    type: String,
    required: [true, '分类不能为空'],
    trim: true,
    index: true
  },
  // 封面图路径
  icon: {
    type: String,
    default: ''
  },
  // 是否启用（后端控制前端显示）
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  // 科目描述
  description: {
    type: String,
    maxlength: [500, '描述最多500个字符']
  },
  // 排序权重（数值越大越靠前）
  sortOrder: {
    type: Number,
    default: 0
  },
  // 题目总数（冗余字段，提升查询性能）
  questionCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true, // 自动添加 createdAt 和 updatedAt
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// 索引优化
examSchema.index({ isActive: 1, sortOrder: -1 });
examSchema.index({ category: 1, isActive: 1 });

// 虚拟字段：题目列表
examSchema.virtual('questions', {
  ref: 'Question',
  localField: '_id',
  foreignField: 'examId'
});

// 静态方法：获取激活的科目列表
examSchema.statics.findActive = function() {
  return this.find({ isActive: true }).sort({ sortOrder: -1, createdAt: -1 });
};

// 实例方法：切换启用状态
examSchema.methods.toggleActive = function() {
  this.isActive = !this.isActive;
  return this.save();
};

module.exports = mongoose.model('Exam', examSchema);
