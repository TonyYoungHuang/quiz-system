const ImportTask = require('../models/ImportTask');
const Question = require('../models/Question');
const {
  parseCsv,
  parseJsonl,
  normalizeQuestion,
  validateQuestions
} = require('../services/importPipeline');

const updateExamQuestionCount = async (examId) => {
  if (!examId) return;
  const count = await Question.countDocuments({ examId });
  await require('../models/Exam').findByIdAndUpdate(examId, { questionCount: count });
};

exports.upload = async (req, res) => {
  try {
    const { examId, source, rawText, format } = req.body;
    const task = await ImportTask.create({
      examId,
      status: 'uploaded',
      source: { ...(source || {}), format: format || (source && source.format) },
      rawText: rawText || ''
    });

    res.status(201).json({
      success: true,
      data: task
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Failed to create import task',
      error: error.message
    });
  }
};

exports.extract = async (req, res) => {
  try {
    const { taskId, extractedText, format } = req.body;
    const task = await ImportTask.findById(taskId);
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    task.extractedText = extractedText || task.rawText || '';
    if (format) task.source = { ...(task.source || {}), format };
    task.status = 'extracted';
    await task.save();

    res.json({ success: true, data: task });
  } catch (error) {
    res.status(400).json({ success: false, message: 'Failed to extract', error: error.message });
  }
};

exports.parse = async (req, res) => {
  try {
    const { taskId, questions, format, text } = req.body;
    const task = await ImportTask.findById(taskId);
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    let parsed = [];
    if (Array.isArray(questions) && questions.length > 0) {
      parsed = questions.map(normalizeQuestion);
    } else {
      const fmt = format || (task.source && task.source.format) || 'csv';
      const inputText = text || task.extractedText || task.rawText || '';
      if (fmt === 'jsonl') {
        parsed = parseJsonl(inputText);
      } else if (fmt === 'csv') {
        parsed = parseCsv(inputText);
      } else if (fmt === 'raw') {
        parsed = parseJsonl(inputText);
      } else {
        parsed = parseCsv(inputText);
      }
    }

    task.parsedQuestions = parsed;
    task.status = 'parsed';
    await task.save();

    res.json({ success: true, data: task });
  } catch (error) {
    res.status(400).json({ success: false, message: 'Failed to parse', error: error.message });
  }
};

exports.validate = async (req, res) => {
  try {
    const { taskId } = req.body;
    const task = await ImportTask.findById(taskId);
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    const questions = Array.isArray(task.parsedQuestions) ? task.parsedQuestions : [];
    const errors = validateQuestions(questions);
    task.validation = { errors };
    task.status = errors.length > 0 ? 'validation_failed' : 'validated';
    await task.save();

    res.json({ success: true, data: task.validation, status: task.status });
  } catch (error) {
    res.status(400).json({ success: false, message: 'Failed to validate', error: error.message });
  }
};

exports.saveDraft = async (req, res) => {
  try {
    const { taskId, payload } = req.body;
    const task = await ImportTask.findByIdAndUpdate(
      taskId,
      { result: payload || {}, status: 'ready' },
      { new: true }
    );

    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    res.json({ success: true, data: task });
  } catch (error) {
    res.status(400).json({ success: false, message: 'Failed to save draft', error: error.message });
  }
};

exports.exportData = async (req, res) => {
  try {
    const { taskId } = req.body;
    const task = await ImportTask.findById(taskId).lean();
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    const questions = task.parsedQuestions || [];
    const jsonl = questions.map(q => JSON.stringify(q)).join('\n');

    res.json({
      success: true,
      data: {
        questions,
        jsonl
      }
    });
  } catch (error) {
    res.status(400).json({ success: false, message: 'Failed to export', error: error.message });
  }
};

exports.commit = async (req, res) => {
  try {
    const { taskId, examId } = req.body;
    const task = await ImportTask.findById(taskId);
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    const finalExamId = examId || task.examId;
    if (!finalExamId) {
      return res.status(400).json({ success: false, message: 'examId is required' });
    }

    const questions = Array.isArray(task.parsedQuestions) ? task.parsedQuestions : [];
    if (questions.length === 0) {
      return res.status(400).json({ success: false, message: 'No questions to import' });
    }

    const questionsWithExamId = questions.map(q => ({ ...q, examId: finalExamId }));
    const result = await Question.insertMany(questionsWithExamId);

    await updateExamQuestionCount(finalExamId);

    task.status = 'committed';
    task.result = { imported: result.length, examId: finalExamId };
    await task.save();

    res.json({ success: true, data: task.result });
  } catch (error) {
    res.status(400).json({ success: false, message: 'Failed to commit import', error: error.message });
  }
};

exports.getTasks = async (req, res) => {
  try {
    const tasks = await ImportTask.find()
      .sort({ createdAt: -1 })
      .lean();

    res.json({ success: true, data: tasks, count: tasks.length });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to get tasks', error: error.message });
  }
};

exports.getTask = async (req, res) => {
  try {
    const task = await ImportTask.findById(req.params.id).lean();
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }
    res.json({ success: true, data: task });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to get task', error: error.message });
  }
};

module.exports = exports;
