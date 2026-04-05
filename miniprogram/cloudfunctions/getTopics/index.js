const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;

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

async function getQuestionCount(topicIds) {
  if (!topicIds.length) return 0;

  const countResult = await db.collection('questions')
    .where({
      topicId: _.in(topicIds)
    })
    .count();

  return countResult.total || 0;
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

    if (event.parentId !== undefined && event.parentId !== null && event.parentId !== '') {
      where.parentId = event.parentId;
    }

    const result = await db.collection('topics')
      .where(where)
      .orderBy('order', 'asc')
      .orderBy('createdAt', 'asc')
      .get();

    const topics = result.data || [];

    const enrichedTopics = await Promise.all(topics.map(async (topic) => {
      const childIds = topics
        .filter(item => item.parentId === topic._id)
        .map(item => item._id);

      const questionCount = await getQuestionCount([topic._id, ...childIds]);
      return {
        ...topic,
        questionCount
      };
    }));

    return {
      success: true,
      data: enrichedTopics
    };
  } catch (error) {
    console.error('[getTopics] error', error);
    return {
      success: false,
      message: '获取专题失败',
      error: error.message
    };
  }
};
