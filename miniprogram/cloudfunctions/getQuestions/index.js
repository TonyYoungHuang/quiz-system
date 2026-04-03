const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;

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

async function fetchAllQuestions(where) {
  const questions = [];
  let skip = 0;

  while (true) {
    const result = await db.collection('questions')
      .where(where)
      .orderBy('sortOrder', 'asc')
      .skip(skip)
      .limit(100)
      .get();

    const batch = result.data || [];
    questions.push(...batch);
    if (batch.length < 100) break;
    skip += 100;
  }

  return questions;
}

exports.main = async (event = {}) => {
  const examId = event.examId;

  if (!examId) {
    return {
      success: false,
      message: '缺少 examId 参数'
    };
  }

  try {
    const where = { examId };
    if (event.type) where.type = event.type;

    if (event.topicId) {
      const topicIds = await collectTopicIds(event.topicId);
      where.topicId = _.in(topicIds);
    }

    if (event.paperId) {
      where.paperId = event.paperId;
    }

    return {
      success: true,
      data: (await fetchAllQuestions(where)).map(normalizeJudgeQuestion)
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
