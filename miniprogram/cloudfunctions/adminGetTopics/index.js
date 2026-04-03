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

function formatDateTime(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString();
}

exports.main = async (event = {}) => {
  try {
    const auth = await validateAdminToken(event.token);
    if (!auth.valid) {
      return {
        success: false,
        message: auth.message
      };
    }

    const where = {};
    if (event.examId) {
      where.examId = event.examId;
    }

    const result = await db.collection('topics')
      .where(where)
      .orderBy('order', 'asc')
      .orderBy('createdAt', 'asc')
      .get();

    const topics = result.data || [];
    const childMap = {};
    topics.forEach(item => {
      const key = item.parentId || '__root__';
      if (!childMap[key]) childMap[key] = [];
      childMap[key].push(item);
    });

    const collectDescendantIds = (topicId) => {
      const ids = [topicId];
      const stack = [...(childMap[topicId] || [])];
      while (stack.length > 0) {
        const current = stack.shift();
        ids.push(current._id);
        (childMap[current._id] || []).forEach(item => stack.push(item));
      }
      return ids;
    };

    const enriched = await Promise.all(topics.map(async (topic) => {
      const relatedTopicIds = collectDescendantIds(topic._id);
      const [examResult, parentResult, questionCount] = await Promise.all([
        db.collection('exams').doc(topic.examId).get().catch(() => ({ data: null })),
        topic.parentId ? db.collection('topics').doc(topic.parentId).get().catch(() => ({ data: null })) : Promise.resolve({ data: null }),
        db.collection('questions').where({
          topicId: db.command.in(relatedTopicIds)
        }).count()
      ]);

      return {
        ...topic,
        isActive: topic.isActive !== false,
        statusText: topic.isActive === false ? '已停用' : '已启用',
        examName: examResult.data ? examResult.data.name || '' : '',
        parentName: parentResult.data ? parentResult.data.name || '' : '',
        questionCount: questionCount.total || 0,
        createdAtText: formatDateTime(topic.createdAt),
        updatedAtText: formatDateTime(topic.updatedAt)
      };
    }));

    return {
      success: true,
      data: enriched
    };
  } catch (error) {
    console.error('[adminGetTopics] error', error);
    return {
      success: false,
      message: '获取专题列表失败',
      error: error.message
    };
  }
};
