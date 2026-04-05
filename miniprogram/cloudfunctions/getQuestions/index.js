const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;
const MAX_FETCH_LIMIT = 300;
const ID_CHUNK_SIZE = 100;

function getCurrentUserId(event = {}) {
  const wxContext = cloud.getWXContext();
  return wxContext.OPENID || event.userId || '';
}

async function hasExamPermission(userId, examId) {
  if (!userId || !examId) return false;

  const result = await db.collection('user_permissions')
    .where({
      userId,
      examId
    })
    .limit(1)
    .get();

  if (!result.data.length) return false;

  const permission = result.data[0];
  return permission.isPermanent ||
    (permission.expiresAt && new Date(permission.expiresAt) > new Date());
}

function normalizeJudgeQuestion(question) {
  if (question.type !== 'JUDGE') {
    return question;
  }

  let answer = question.answer;
  if (answer === 'true' || answer === true) answer = 'A';
  if (answer === 'false' || answer === false) answer = 'B';

  const options = question.options && Object.keys(question.options).length > 0
    ? question.options
    : { A: '正确', B: '错误' };

  return {
    ...question,
    answer,
    options
  };
}

async function collectTopicIds(rootTopicId) {
  const topicIds = [];
  const queue = [rootTopicId];

  while (queue.length > 0) {
    const current = queue.shift();
    topicIds.push(current);

    const childResult = await db.collection('topics')
      .where({ parentId: current, isActive: true })
      .get();

    childResult.data.forEach(item => {
      queue.push(item._id);
    });
  }

  return topicIds;
}

async function countQuestions(where) {
  const result = await db.collection('questions').where(where).count();
  return result.total || 0;
}

async function fetchQuestions(where, options = {}) {
  const limit = Math.max(1, Math.min(parseInt(options.limit || MAX_FETCH_LIMIT, 10), MAX_FETCH_LIMIT));
  const skip = Math.max(0, parseInt(options.skip || 0, 10));

  if (options.fetchAll) {
    const questions = [];
    let currentSkip = skip;

    while (true) {
      const result = await db.collection('questions')
        .where(where)
        .orderBy('sortOrder', 'asc')
        .skip(currentSkip)
        .limit(100)
        .get();

      const batch = result.data || [];
      questions.push(...batch);
      if (batch.length < 100) break;
      currentSkip += 100;
    }

    return questions;
  }

  const result = await db.collection('questions')
    .where(where)
    .orderBy('sortOrder', 'asc')
    .skip(skip)
    .limit(limit)
    .get();

  return result.data || [];
}

async function fetchQuestionsByIds(questionIds = [], filters = {}) {
  const uniqueIds = [];
  const idSeen = new Set();

  questionIds.forEach(id => {
    const normalized = String(id || '').trim();
    if (!normalized || idSeen.has(normalized)) return;
    idSeen.add(normalized);
    uniqueIds.push(normalized);
  });

  if (!uniqueIds.length) return [];

  const docs = new Map();
  for (let i = 0; i < uniqueIds.length; i += ID_CHUNK_SIZE) {
    const batchIds = uniqueIds.slice(i, i + ID_CHUNK_SIZE);
    const result = await db.collection('questions')
      .where({ _id: _.in(batchIds) })
      .get();

    (result.data || []).forEach(item => {
      docs.set(item._id, item);
    });
  }

  return uniqueIds
    .map(id => docs.get(id))
    .filter(item => {
      if (!item) return false;
      if (filters.examId && item.examId !== filters.examId) return false;
      if (filters.paperId && item.paperId !== filters.paperId) return false;
      if (filters.type && item.type !== filters.type) return false;
      if (filters.topicIds && filters.topicIds.length && !filters.topicIds.includes(item.topicId)) return false;
      return true;
    });
}

exports.main = async (event = {}) => {
  const examId = event.examId;
  const userId = getCurrentUserId(event);

  if (!examId) {
    return {
      success: false,
      message: '缺少 examId 参数'
    };
  }

  try {
    const allowed = await hasExamPermission(userId, examId);
    if (!allowed) {
      return {
        success: false,
        message: '未激活该科目'
      };
    }

    const baseWhere = { examId };
    if (event.type) baseWhere.type = event.type;

    let topicIds = [];
    if (event.topicId) {
      topicIds = await collectTopicIds(event.topicId);
      baseWhere.topicId = _.in(topicIds);
    }

    if (event.paperId) {
      baseWhere.paperId = event.paperId;
    }

    const totalCount = await countQuestions(baseWhere);
    let questions = [];
    let remainingCount = totalCount;

    const questionIds = Array.isArray(event.questionIds) ? event.questionIds : [];
    const excludeIds = Array.isArray(event.excludeIds)
      ? event.excludeIds.map(id => String(id || '').trim()).filter(Boolean)
      : [];

    if (questionIds.length > 0) {
      questions = await fetchQuestionsByIds(questionIds, {
        examId,
        paperId: event.paperId || '',
        type: event.type || '',
        topicIds
      });
      remainingCount = questions.length;
    } else {
      const where = { ...baseWhere };
      if (excludeIds.length > 0) {
        where._id = _.nin(excludeIds);
        remainingCount = await countQuestions(where);
      }

      questions = await fetchQuestions(where, {
        limit: event.limit,
        skip: event.skip,
        fetchAll: !event.limit
      });
    }

    return {
      success: true,
      data: questions.map(normalizeJudgeQuestion),
      totalCount,
      remainingCount
    };
  } catch (error) {
    console.error('[getQuestions] error', error);
    return {
      success: false,
      message: '获取题目失败',
      error: error.message
    };
  }
};
