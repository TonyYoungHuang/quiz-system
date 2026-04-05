const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

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

async function getQuestionCount(paperId) {
  const result = await db.collection('questions')
    .where({ paperId })
    .count();

  return result.total || 0;
}

exports.main = async (event = {}) => {
  try {
    const userId = getCurrentUserId(event);
    if (!event.examId) {
      return {
        success: false,
        message: '缺少 examId 参数'
      };
    }

    const allowed = await hasExamPermission(userId, event.examId);
    if (!allowed) {
      return {
        success: false,
        message: '未激活该科目'
      };
    }

    const where = {
      isActive: true,
      examId: event.examId
    };

    const result = await db.collection('papers')
      .where(where)
      .orderBy('year', 'desc')
      .orderBy('order', 'asc')
      .orderBy('createdAt', 'asc')
      .get();

    const papers = await Promise.all((result.data || []).map(async (paper) => ({
      ...paper,
      questionCount: await getQuestionCount(paper._id)
    })));

    return {
      success: true,
      data: papers
    };
  } catch (error) {
    console.error('[getPapers] error', error);
    return {
      success: false,
      message: '获取试卷失败',
      error: error.message
    };
  }
};
