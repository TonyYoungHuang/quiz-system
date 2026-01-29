const Question = require('../models/Question');
const UserPermission = require('../models/UserPermission');

/**
 * 获取某科目的题目列表
 * GET /api/v1/questions/:examId
 *
 * 查询参数：
 * - type: 题型筛选 (SINGLE/MULTI/JUDGE)
 * - userId: 用户ID（用于验证权限）
 */
exports.getQuestions = async (req, res) => {
  try {
    const { examId } = req.params;
    const { type, userId } = req.query;

    // 如果提供了 userId，验证权限
    if (userId) {
      const hasPermission = await UserPermission.hasPermission(userId, examId);
      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          message: '您暂无权限访问该科目题目'
        });
      }
    }

    const query = { examId };
    if (type) {
      query.type = type;
    }

    const questions = await Question.find(query)
      .select('-__v') // 排除版本号
      .sort({ sortOrder: 1, createdAt: 1 })
      .lean();

    // 剔除正确答案（前端答题时不应该看到答案）
    const questionsForQuiz = questions.map(q => ({
      _id: q._id,
      examId: q.examId,
      type: q.type,
      content: q.content,
      options: q.options,
      mediaUrl: q.mediaUrl,
      difficulty: q.difficulty,
      tags: q.tags
      // 注意：不返回 answer 和 explanation
    }));

    res.json({
      success: true,
      data: questionsForQuiz,
      count: questionsForQuiz.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '获取题目失败',
      error: error.message
    });
  }
};

/**
 * 获取单道题目详情（含答案解析）
 * GET /api/v1/questions/:examId/:questionId
 */
exports.getQuestionDetail = async (req, res) => {
  try {
    const { questionId } = req.params;
    const { userId } = req.query;

    const question = await Question.findById(questionId).lean();

    if (!question) {
      return res.status(404).json({
        success: false,
        message: '题目不存在'
      });
    }

    // 验证权限
    if (userId) {
      const hasPermission = await UserPermission.hasPermission(userId, question.examId);
      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          message: '您暂无权限访问该题目'
        });
      }
    }

    res.json({
      success: true,
      data: question
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '获取题目详情失败',
      error: error.message
    });
  }
};

/**
 * 获取题目总数统计
 * GET /api/v1/admin/count
 */
exports.getQuestionsCount = async (req, res) => {
  try {
    const count = await Question.countDocuments();
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
 * 获取所有题目（管理员功能）
 * GET /api/v1/admin
 */
exports.getAllQuestions = async (req, res) => {
  try {
    const { examId, type } = req.query;

    const query = {};
    if (examId) query.examId = examId;
    if (type) query.type = type;

    const questions = await Question.find(query)
      .populate('examId', 'name')
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      success: true,
      data: questions,
      count: questions.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '获取题目列表失败',
      error: error.message
    });
  }
};

/**
 * 创建题目（管理员功能）
 * POST /api/v1/admin/questions
 */
exports.createQuestion = async (req, res) => {
  try {
    const question = await Question.create(req.body);

    // 更新题库计数
    await updateExamQuestionCount(req.body.examId);

    res.status(201).json({
      success: true,
      message: '题目创建成功',
      data: question
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: '创建题目失败',
      error: error.message
    });
  }
};

/**
 * 批量导入题目（管理员功能）
 * POST /api/v1/admin/questions/import
 *
 * 请求体：
 * {
 *   "examId": "科目ID",
 *   "questions": [...]
 * }
 */
exports.importQuestions = async (req, res) => {
  try {
    const { examId, questions } = req.body;

    if (!Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({
        success: false,
        message: '题目数据不能为空'
      });
    }

    // 为每道题添加 examId
    const questionsWithExamId = questions.map(q => ({
      ...q,
      examId
    }));

    // 批量插入
    const result = await Question.insertMany(questionsWithExamId);

    // 更新题库计数
    await updateExamQuestionCount(examId);

    res.status(201).json({
      success: true,
      message: `成功导入 ${result.length} 道题目`,
      data: {
        imported: result.length,
        examId
      }
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: '导入题目失败',
      error: error.message
    });
  }
};

/**
 * 更新题目（管理员功能）
 * PUT /api/v1/admin/questions/:id
 */
exports.updateQuestion = async (req, res) => {
  try {
    const question = await Question.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!question) {
      return res.status(404).json({
        success: false,
        message: '题目不存在'
      });
    }

    res.json({
      success: true,
      message: '题目更新成功',
      data: question
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: '更新题目失败',
      error: error.message
    });
  }
};

/**
 * 删除题目（管理员功能）
 * DELETE /api/v1/admin/questions/:id
 */
exports.deleteQuestion = async (req, res) => {
  try {
    const question = await Question.findByIdAndDelete(req.params.id);

    if (!question) {
      return res.status(404).json({
        success: false,
        message: '题目不存在'
      });
    }

    // 更新题库计数
    await updateExamQuestionCount(question.examId);

    res.json({
      success: true,
      message: '题目删除成功'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '删除题目失败',
      error: error.message
    });
  }
};

// ==================== 辅助函数 ====================

/**
 * 更新科目的题目计数
 */
async function updateExamQuestionCount(examId) {
  const count = await Question.countDocuments({ examId });
  await require('../models/Exam').findByIdAndUpdate(examId, { questionCount: count });
}

module.exports = exports;
