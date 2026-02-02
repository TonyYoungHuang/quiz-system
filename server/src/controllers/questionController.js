const Question = require('../models/Question');
const UserPermission = require('../models/UserPermission');
const TopicQuestion = require('../models/TopicQuestion');
const PaperQuestion = require('../models/PaperQuestion');

const normalizeBlocks = (blocks, fallbackText) => {
  if (Array.isArray(blocks) && blocks.length > 0) return blocks;
  if (!fallbackText) return [];
  return [{ type: 'text', content: { zh: fallbackText } }];
};

const normalizeOptions = (options) => {
  if (!Array.isArray(options)) return [];
  return options.map(opt => {
    const contentBlocks = Array.isArray(opt.content) && opt.content.length > 0
      ? opt.content
      : (opt.value ? [{ type: 'text', content: { zh: opt.value } }] : []);
    const valueText = opt.value || (contentBlocks[0] && contentBlocks[0].content && contentBlocks[0].content.zh) || '';
    return {
      ...opt,
      value: valueText,
      content: contentBlocks
    };
  });
};

const normalizeQuestion = (q) => {
  const stem = normalizeBlocks(q.stem, q.content);
  const analysis = normalizeBlocks(q.analysis, q.explanation);
  const options = normalizeOptions(q.options);
  const media = (Array.isArray(q.media) && q.media.length > 0)
    ? q.media
    : (q.mediaUrl ? [{ type: 'image', url: q.mediaUrl, desc: '' }] : []);

  return {
    ...q,
    stem,
    options,
    analysis,
    media
  };
};

/**
 * GET /api/v1/questions/:examId
 * Query: type, userId
 */
exports.getQuestions = async (req, res) => {
  try {
    const { examId } = req.params;
    const { type, userId, topicId, paperId } = req.query;

    if (userId) {
      const hasPermission = await UserPermission.hasPermission(userId, examId);
      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          message: 'No permission to access this exam questions'
        });
      }
    }

    const query = { examId };
    if (type) query.type = type;
    if (topicId || paperId) {
      const ids = [];
      if (topicId) {
        const topicLinks = await TopicQuestion.find({ topicId }).select('questionId').lean();
        ids.push(...topicLinks.map(link => String(link.questionId)));
      }
      if (paperId) {
        const paperLinks = await PaperQuestion.find({ paperId }).select('questionId').lean();
        const paperIds = paperLinks.map(link => String(link.questionId));
        if (ids.length > 0) {
          const set = new Set(paperIds);
          const intersect = ids.filter(id => set.has(id));
          query._id = { $in: intersect };
        } else {
          query._id = { $in: paperIds };
        }
      } else {
        query._id = { $in: ids };
      }
    }

    const questions = await Question.find(query)
      .select('-__v')
      .sort({ sortOrder: 1, createdAt: 1 })
      .lean();

    const questionsForQuiz = questions.map(q => {
      const normalized = normalizeQuestion(q);
      return {
        _id: normalized._id,
        examId: normalized.examId,
        type: normalized.type,
        content: normalized.content,
        stem: normalized.stem,
        options: normalized.options,
        mediaUrl: normalized.mediaUrl,
        media: normalized.media,
        difficulty: normalized.difficulty,
        tags: normalized.tags
      };
    });

    res.json({
      success: true,
      data: questionsForQuiz,
      count: questionsForQuiz.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get questions',
      error: error.message
    });
  }
};

/**
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
        message: 'Question not found'
      });
    }

    if (userId) {
      const hasPermission = await UserPermission.hasPermission(userId, question.examId);
      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          message: 'No permission to access this question'
        });
      }
    }

    res.json({
      success: true,
      data: normalizeQuestion(question)
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get question detail',
      error: error.message
    });
  }
};

/**
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
      message: 'Failed to get count',
      error: error.message
    });
  }
};

/**
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

    const normalized = questions.map(q => normalizeQuestion(q));

    res.json({
      success: true,
      data: normalized,
      count: normalized.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get questions',
      error: error.message
    });
  }
};

/**
 * POST /api/v1/admin/questions
 */
exports.createQuestion = async (req, res) => {
  try {
    const question = await Question.create(req.body);

    await updateExamQuestionCount(req.body.examId);

    res.status(201).json({
      success: true,
      message: 'Question created',
      data: question
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Failed to create question',
      error: error.message
    });
  }
};

/**
 * POST /api/v1/admin/questions/import
 * { examId, questions: [...] }
 */
exports.importQuestions = async (req, res) => {
  try {
    const { examId, questions } = req.body;

    if (!Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Questions cannot be empty'
      });
    }

    const questionsWithExamId = questions.map(q => ({
      ...q,
      examId
    }));

    const result = await Question.insertMany(questionsWithExamId);

    await updateExamQuestionCount(examId);

    res.status(201).json({
      success: true,
      message: `Imported ${result.length} questions`,
      data: {
        imported: result.length,
        examId
      }
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Failed to import questions',
      error: error.message
    });
  }
};

/**
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
        message: 'Question not found'
      });
    }

    res.json({
      success: true,
      message: 'Question updated',
      data: question
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Failed to update question',
      error: error.message
    });
  }
};

/**
 * DELETE /api/v1/admin/questions/:id
 */
exports.deleteQuestion = async (req, res) => {
  try {
    const question = await Question.findByIdAndDelete(req.params.id);

    if (!question) {
      return res.status(404).json({
        success: false,
        message: 'Question not found'
      });
    }

    await updateExamQuestionCount(question.examId);

    res.json({
      success: true,
      message: 'Question deleted'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete question',
      error: error.message
    });
  }
};

async function updateExamQuestionCount(examId) {
  const count = await Question.countDocuments({ examId });
  await require('../models/Exam').findByIdAndUpdate(examId, { questionCount: count });
}

module.exports = exports;
