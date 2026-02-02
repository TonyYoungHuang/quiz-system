const Paper = require('../models/Paper');
const PaperQuestion = require('../models/PaperQuestion');

exports.getPapers = async (req, res) => {
  try {
    const { examId } = req.query;
    const query = {};
    if (examId) query.examId = examId;

    const papers = await Paper.find(query)
      .sort({ year: -1, order: 1, createdAt: 1 })
      .lean();

    res.json({
      success: true,
      data: papers,
      count: papers.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get papers',
      error: error.message
    });
  }
};

exports.createPaper = async (req, res) => {
  try {
    const paper = await Paper.create(req.body);
    res.status(201).json({
      success: true,
      message: 'Paper created',
      data: paper
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Failed to create paper',
      error: error.message
    });
  }
};

exports.updatePaper = async (req, res) => {
  try {
    const paper = await Paper.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!paper) {
      return res.status(404).json({
        success: false,
        message: 'Paper not found'
      });
    }

    res.json({
      success: true,
      message: 'Paper updated',
      data: paper
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Failed to update paper',
      error: error.message
    });
  }
};

exports.deletePaper = async (req, res) => {
  try {
    const paper = await Paper.findByIdAndDelete(req.params.id);
    if (!paper) {
      return res.status(404).json({
        success: false,
        message: 'Paper not found'
      });
    }

    await PaperQuestion.deleteMany({ paperId: paper._id });

    res.json({
      success: true,
      message: 'Paper deleted'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete paper',
      error: error.message
    });
  }
};

exports.bindQuestions = async (req, res) => {
  try {
    const { questionIds } = req.body;
    if (!Array.isArray(questionIds) || questionIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'questionIds is required'
      });
    }

    const paperId = req.params.id;
    const docs = questionIds.map((questionId, index) => ({
      paperId,
      questionId,
      order: index
    }));

    const result = await PaperQuestion.insertMany(docs, { ordered: false });

    res.json({
      success: true,
      message: 'Questions bound to paper',
      data: { bound: result.length }
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Failed to bind questions',
      error: error.message
    });
  }
};

exports.unbindQuestions = async (req, res) => {
  try {
    const { questionIds } = req.body;
    if (!Array.isArray(questionIds) || questionIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'questionIds is required'
      });
    }

    const paperId = req.params.id;
    const result = await PaperQuestion.deleteMany({
      paperId,
      questionId: { $in: questionIds }
    });

    res.json({
      success: true,
      message: 'Questions unbound from paper',
      data: { deleted: result.deletedCount }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to unbind questions',
      error: error.message
    });
  }
};

module.exports = exports;
