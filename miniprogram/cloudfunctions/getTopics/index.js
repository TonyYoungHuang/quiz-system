const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

async function getQuestionCount(topicIds) {
  if (!topicIds.length) return 0;

  const _ = db.command;
  const countResult = await db.collection('questions')
    .where({
      topicId: _.in(topicIds)
    })
    .count();

  return countResult.total || 0;
}

exports.main = async (event = {}) => {
  try {
    const where = {
      isActive: true
    };

    if (event.examId) {
      where.examId = event.examId;
    }

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
