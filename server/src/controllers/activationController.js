const ActivationCode = require('../models/ActivationCode');
const UserPermission = require('../models/UserPermission');
const Exam = require('../models/Exam');

/**
 * 激活码核销接口
 * POST /api/v1/activate
 *
 * 请求体：
 * {
 *   "code": "ABC12345",
 *   "userId": "用户OpenID"
 * }
 */
exports.activateCode = async (req, res) => {
  try {
    const { code, userId } = req.body;

    // 参数验证
    if (!code || !userId) {
      return res.status(400).json({
        success: false,
        message: '缺少必要参数'
      });
    }

    // 查找激活码
    const activationCode = await ActivationCode.findOne({
      code: code.toUpperCase().trim()
    }).populate('examId');

    if (!activationCode) {
      return res.status(404).json({
        success: false,
        message: '激活码不存在'
      });
    }

    // 检查是否已使用
    if (activationCode.isUsed) {
      return res.status(400).json({
        success: false,
        message: '该激活码已被使用'
      });
    }

    // 检查是否过期
    if (activationCode.expiresAt && activationCode.expiresAt < new Date()) {
      return res.status(400).json({
        success: false,
        message: '该激活码已过期'
      });
    }

    // 检查科目是否存在且启用
    if (!activationCode.examId || !activationCode.examId.isActive) {
      return res.status(400).json({
        success: false,
        message: '该激活码绑定的科目不可用'
      });
    }

    // 核销激活码
    const redeemResult = await activationCode.redeem(userId);

    if (!redeemResult.success) {
      return res.status(400).json({
        success: false,
        message: redeemResult.message
      });
    }

    // 授予用户权限
    await UserPermission.grant(userId, activationCode.examId._id, activationCode._id);

    res.json({
      success: true,
      message: '激活成功',
      data: {
        examId: activationCode.examId._id,
        examName: activationCode.examId.name,
        activatedAt: activationCode.activatedAt
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '激活失败',
      error: error.message
    });
  }
};

/**
 * 查询用户拥有的权限
 * GET /api/v1/permissions/:userId
 */
exports.getUserPermissions = async (req, res) => {
  try {
    const { userId } = req.params;

    const permissions = await UserPermission.getUserPermissions(userId);

    res.json({
      success: true,
      data: permissions,
      count: permissions.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '获取权限失败',
      error: error.message
    });
  }
};

/**
 * 检查用户是否有权限访问某科目
 * GET /api/v1/permissions/check
 *
 * 查询参数：userId, examId
 */
exports.checkPermission = async (req, res) => {
  try {
    const { userId, examId } = req.query;

    if (!userId || !examId) {
      return res.status(400).json({
        success: false,
        message: '缺少必要参数'
      });
    }

    const hasPermission = await UserPermission.hasPermission(userId, examId);

    res.json({
      success: true,
      data: {
        hasPermission,
        userId,
        examId
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '检查权限失败',
      error: error.message
    });
  }
};

// ==================== 管理员接口 ====================

/**
 * 生成激活码（管理员功能）
 * POST /api/v1/admin/codes/generate
 *
 * 请求体：
 * {
 *   "examId": "科目ID",
 *   "count": 10,
 *   "source": "XHS",
 *   "note": "备注"
 * }
 */
exports.generateCodes = async (req, res) => {
  try {
    const { examId, count, source = 'MANUAL', note } = req.body;

    // 验证科目存在
    const exam = await Exam.findById(examId);
    if (!exam) {
      return res.status(404).json({
        success: false,
        message: '科目不存在'
      });
    }

    // 批量生成激活码
    const codes = await ActivationCode.batchGenerate(examId, count, source);

    // 如果有备注，更新备注
    if (note) {
      await ActivationCode.updateMany(
        { _id: { $in: codes.map(c => c._id) } },
        { note }
      );
    }

    res.status(201).json({
      success: true,
      message: `成功生成 ${count} 个激活码`,
      data: codes
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '生成激活码失败',
      error: error.message
    });
  }
};

/**
 * 查询激活码列表（管理员功能）
 * GET /api/v1/admin/codes
 */
exports.getCodes = async (req, res) => {
  try {
    const { examId, isUsed, source, page = 1, limit = 50 } = req.query;

    const query = {};
    if (examId) query.examId = examId;
    if (isUsed !== undefined) query.isUsed = isUsed === 'true';
    if (source) query.source = source;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [codes, total] = await Promise.all([
      ActivationCode.find(query)
        .populate('examId', 'name category')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      ActivationCode.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: codes,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '获取激活码列表失败',
      error: error.message
    });
  }
};

/**
 * 获取激活码总数统计
 * GET /api/v1/codes/count
 */
exports.getCodesCount = async (req, res) => {
  try {
    const count = await ActivationCode.countDocuments();
    res.json({
      success: true,
      data: { count }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '获取统计失败',
      error: error.message
    });
  }
};

/**
 * 获取用户权限总数统计
 * GET /api/v1/permissions/count
 */
exports.getPermissionsCount = async (req, res) => {
  try {
    // 统计唯一用户数
    const count = await UserPermission.distinct('userId').then(ids => ids.length);
    res.json({
      success: true,
      data: { count }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '获取统计失败',
      error: error.message
    });
  }
};

/**
 * 删除激活码（管理员功能）
 * DELETE /api/v1/admin/codes/:id
 */
exports.deleteCode = async (req, res) => {
  try {
    const code = await ActivationCode.findByIdAndDelete(req.params.id);

    if (!code) {
      return res.status(404).json({
        success: false,
        message: '激活码不存在'
      });
    }

    res.json({
      success: true,
      message: '激活码删除成功'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '删除激活码失败',
      error: error.message
    });
  }
};
