const Exam = require('../models/Exam');

/**
 * 获取科目总数统计
 * GET /api/v1/exams/count/stats
 */
exports.getExamsCount = async (req, res) => {
  try {
    const count = await Exam.countDocuments({ isActive: true });
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
 * 获取所有启用的科目列表
 * GET /api/v1/exams
 */
exports.getExams = async (req, res) => {
  try {
    // 支持按分类筛选
    const { category } = req.query;

    const query = { isActive: true };
    if (category) {
      query.category = category;
    }

    const exams = await Exam.find(query)
      .select('name category icon description questionCount')
      .sort({ sortOrder: -1, createdAt: -1 })
      .lean();

    res.json({
      success: true,
      data: exams,
      count: exams.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '获取科目列表失败',
      error: error.message
    });
  }
};

/**
 * 获取单个科目详情
 * GET /api/v1/exams/:id
 */
exports.getExamById = async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id);

    if (!exam) {
      return res.status(404).json({
        success: false,
        message: '科目不存在'
      });
    }

    res.json({
      success: true,
      data: exam
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '获取科目详情失败',
      error: error.message
    });
  }
};

/**
 * 创建新科目（管理员功能）
 * POST /api/v1/admin/exams
 */
exports.createExam = async (req, res) => {
  try {
    const { name, category, icon, description, sortOrder } = req.body;

    const exam = await Exam.create({
      name,
      category,
      icon,
      description,
      sortOrder
    });

    res.status(201).json({
      success: true,
      message: '科目创建成功',
      data: exam
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: '创建科目失败',
      error: error.message
    });
  }
};

/**
 * 更新科目（管理员功能）
 * PUT /api/v1/admin/exams/:id
 */
exports.updateExam = async (req, res) => {
  try {
    const exam = await Exam.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!exam) {
      return res.status(404).json({
        success: false,
        message: '科目不存在'
      });
    }

    res.json({
      success: true,
      message: '科目更新成功',
      data: exam
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: '更新科目失败',
      error: error.message
    });
  }
};

/**
 * 删除科目（管理员功能）
 * DELETE /api/v1/admin/exams/:id
 */
exports.deleteExam = async (req, res) => {
  try {
    const exam = await Exam.findByIdAndDelete(req.params.id);

    if (!exam) {
      return res.status(404).json({
        success: false,
        message: '科目不存在'
      });
    }

    // 同时需要级联删除相关数据（题目、激活码等）
    await Question.deleteMany({ examId: req.params.id });
    await ActivationCode.deleteMany({ examId: req.params.id });
    await UserPermission.deleteMany({ examId: req.params.id });

    res.json({
      success: true,
      message: '科目删除成功'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '删除科目失败',
      error: error.message
    });
  }
};

/**
 * 切换科目启用状态（管理员功能）
 * PATCH /api/v1/admin/exams/:id/toggle
 */
exports.toggleExamStatus = async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id);

    if (!exam) {
      return res.status(404).json({
        success: false,
        message: '科目不存在'
      });
    }

    await exam.toggleActive();

    res.json({
      success: true,
      message: `科目已${exam.isActive ? '启用' : '禁用'}`,
      data: { isActive: exam.isActive }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '切换状态失败',
      error: error.message
    });
  }
};
