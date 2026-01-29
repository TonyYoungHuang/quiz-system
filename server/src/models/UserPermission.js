const mongoose = require('mongoose');

/**
 * 用户权限表
 * 记录用户对各科目的永久访问权限
 */
const userPermissionSchema = new mongoose.Schema({
  // 用户的 OpenID
  userId: {
    type: String,
    required: [true, '用户ID不能为空'],
    index: true
  },
  // 拥有权限的科目 ID
  examId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Exam',
    required: [true, '科目ID不能为空'],
    index: true
  },
  // 权限来源（激活码ID）
  activationCodeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ActivationCode'
  },
  // 是否永久有效
  isPermanent: {
    type: Boolean,
    default: true
  },
  // 过期时间（如果非永久）
  expiresAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// 复合唯一索引：同一用户对同一科目只有一条权限记录
userPermissionSchema.index({ userId: 1, examId: 1 }, { unique: true });

// 静态方法：检查用户是否有权限访问某科目
userPermissionSchema.statics.hasPermission = async function(userId, examId) {
  const permission = await this.findOne({
    userId,
    examId,
    $or: [
      { isPermanent: true },
      { expiresAt: { $gt: new Date() } }
    ]
  });
  return !!permission;
};

// 静态方法：获取用户的所有权限
userPermissionSchema.statics.getUserPermissions = function(userId) {
  return this.find({ userId })
    .populate('examId', 'name category icon')
    .sort({ createdAt: -1 });
};

// 静态方法：授予用户权限
userPermissionSchema.statics.grant = async function(userId, examId, activationCodeId = null) {
  try {
    return await this.create({
      userId,
      examId,
      activationCodeId,
      isPermanent: true
    });
  } catch (error) {
    if (error.code === 11000) {
      return null; // 已存在权限
    }
    throw error;
  }
};

module.exports = mongoose.model('UserPermission', userPermissionSchema);
