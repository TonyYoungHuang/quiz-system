const mongoose = require('mongoose');

/**
 * 激活码表
 * 用于用户激活解锁科目
 */
const activationCodeSchema = new mongoose.Schema({
  // 8-12位唯一激活码
  code: {
    type: String,
    required: [true, '激活码不能为空'],
    unique: true,
    trim: true,
    uppercase: true,
    validate: {
      validator: function(v) {
        return /^[A-Z0-9]{8,12}$/.test(v);
      },
      message: '激活码必须是8-12位大写字母或数字组合'
    }
  },
  // 绑定的科目 ID
  examId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Exam',
    required: [true, '必须关联一个科目'],
    index: true
  },
  // 是否已核销
  isUsed: {
    type: Boolean,
    default: false,
    index: true
  },
  // 使用者的 OpenID
  userId: {
    type: String,
    default: null,
    index: true
  },
  // 来源渠道：XHS(小红书) / TB(淘宝) / PDD(拼多多) / XY(闲鱼) / MANUAL(手动)
  source: {
    type: String,
    enum: ['XHS', 'TB', 'PDD', 'XY', 'MANUAL'],
    default: 'MANUAL'
  },
  // 备注（可用于记录订单信息等）
  note: {
    type: String,
    maxlength: 200
  },
  // 激活时间
  activatedAt: {
    type: Date,
    default: null
  },
  // 过期时间（可选，用于限时激活码）
  expiresAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// 复合索引：查询未使用的激活码
activationCodeSchema.index({ code: 1, isUsed: 1 });
activationCodeSchema.index({ examId: 1, isUsed: 1 });

// 实例方法：核销激活码
activationCodeSchema.methods.redeem = function(userId) {
  if (this.isUsed) {
    return { success: false, message: '该激活码已被使用' };
  }
  if (this.expiresAt && this.expiresAt < new Date()) {
    return { success: false, message: '该激活码已过期' };
  }
  this.isUsed = true;
  this.userId = userId;
  this.activatedAt = new Date();
  return this.save().then(() => ({ success: true, message: '激活成功' }));
};

// 静态方法：生成激活码
activationCodeSchema.statics.generateCode = function() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 去除易混淆字符
  let code = '';
  for (let i = 0; i < 10; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

// 静态方法：批量生成激活码
activationCodeSchema.statics.batchGenerate = async function(examId, count, source = 'MANUAL') {
  const codes = [];
  for (let i = 0; i < count; i++) {
    let code;
    let attempts = 0;
    do {
      code = this.generateCode();
      attempts++;
      if (attempts > 100) {
        throw new Error('生成激活码失败：重复次数过多');
      }
    } while (await this.findOne({ code }));
    codes.push({ code, examId, source });
  }
  return this.insertMany(codes);
};

module.exports = mongoose.model('ActivationCode', activationCodeSchema);
