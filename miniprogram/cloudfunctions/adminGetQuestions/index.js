const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

async function validateAdminToken(token) {
  const tokenResult = await db.collection('admin_tokens')
    .where({ token })
    .get();

  if (tokenResult.data.length === 0) {
    return {
      valid: false,
      message: '登录状态无效，请重新登录'
    };
  }

  const tokenData = tokenResult.data[0];
  if (tokenData.expiresAt) {
    const expiresAt = new Date(tokenData.expiresAt).getTime();
    if (!Number.isNaN(expiresAt) && expiresAt <= Date.now()) {
      await db.collection('admin_tokens').doc(tokenData._id).remove();
      return {
        valid: false,
        message: '登录已过期，请重新登录'
      };
    }
  }

  return {
    valid: true,
    tokenData
  };
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

exports.main = async (event = {}) => {
  const page = Math.max(1, parseInt(event.page, 10) || 1);
  const pageSize = Math.max(1, Math.min(parseInt(event.pageSize, 10) || 50, 200));

  try {
    const auth = await validateAdminToken(event.token);
    if (!auth.valid) {
      return {
        success: false,
        message: auth.message
      };
    }

    const where = {};
    if (event.examId) where.examId = event.examId;
    if (event.questionType) where.type = event.questionType;

    const countResult = await db.collection('questions').where(where).count();
    const total = countResult.total || 0;
    const skip = (page - 1) * pageSize;

    const query = db.collection('questions').where(where);
    const pageResult = await query
      .orderBy('sortOrder', 'asc')
      .orderBy('createdAt', 'asc')
      .skip(skip)
      .limit(pageSize)
      .get();

    let examName = '';
    if (event.examId) {
      const examResult = await db.collection('exams').doc(event.examId).get().catch(() => ({ data: null }));
      examName = examResult.data ? examResult.data.name || '' : '';
    }

    return {
      success: true,
      data: {
        questions: (pageResult.data || []).map(normalizeJudgeQuestion),
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
        examName
      }
    };
  } catch (error) {
    console.error('[adminGetQuestions] error', error);
    return {
      success: false,
      message: '获取题目列表失败',
      error: error.message
    };
  }
};
