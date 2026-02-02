const Topic = require('../models/Topic');
const TopicQuestion = require('../models/TopicQuestion');

exports.getTopics = async (req, res) => {
  try {
    const { examId } = req.query;
    const query = {};
    if (examId) query.examId = examId;

    const topics = await Topic.find(query)
      .sort({ parentId: 1, order: 1, createdAt: 1 })
      .lean();

    res.json({
      success: true,
      data: topics,
      count: topics.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get topics',
      error: error.message
    });
  }
};

exports.createTopic = async (req, res) => {
  try {
    const topic = await Topic.create(req.body);
    res.status(201).json({
      success: true,
      message: 'Topic created',
      data: topic
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Failed to create topic',
      error: error.message
    });
  }
};

exports.updateTopic = async (req, res) => {
  try {
    const topic = await Topic.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!topic) {
      return res.status(404).json({
        success: false,
        message: 'Topic not found'
      });
    }

    res.json({
      success: true,
      message: 'Topic updated',
      data: topic
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Failed to update topic',
      error: error.message
    });
  }
};

exports.deleteTopic = async (req, res) => {
  try {
    const topic = await Topic.findByIdAndDelete(req.params.id);
    if (!topic) {
      return res.status(404).json({
        success: false,
        message: 'Topic not found'
      });
    }

    await TopicQuestion.deleteMany({ topicId: topic._id });

    res.json({
      success: true,
      message: 'Topic deleted'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete topic',
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

    const topicId = req.params.id;
    const docs = questionIds.map((questionId, index) => ({
      topicId,
      questionId,
      order: index
    }));

    const result = await TopicQuestion.insertMany(docs, { ordered: false });

    res.json({
      success: true,
      message: 'Questions bound to topic',
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

    const topicId = req.params.id;
    const result = await TopicQuestion.deleteMany({
      topicId,
      questionId: { $in: questionIds }
    });

    res.json({
      success: true,
      message: 'Questions unbound from topic',
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
