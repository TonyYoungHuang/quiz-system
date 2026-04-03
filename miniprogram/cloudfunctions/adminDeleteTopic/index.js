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

async function clearQuestionTopic(topicId) {
  let affected = 0;
  while (true) {
    const batch = await db.collection('questions')
      .where({ topicId })
      .limit(100)
      .get();

    if (!batch.data.length) break;

    for (const question of batch.data) {
      await db.collection('questions').doc(question._id).update({
        data: {
          topicId: ''
        }
      });
      affected += 1;
    }
  }
  return affected;
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

    const topicId = event.topicId;
    if (!topicId) {
      return {
        success: false,
        message: '未提供专题 ID'
      };
    }

    const topicResult = await db.collection('topics').doc(topicId).get().catch(() => ({ data: null }));
    if (!topicResult.data) {
      return {
        success: false,
        message: '专题不存在'
      };
    }

    const childResult = await db.collection('topics').where({ parentId: topicId }).get();
    if (childResult.data.length > 0) {
      return {
        success: false,
        message: '请先删除或迁移下级专题'
      };
    }

    const affectedQuestions = await clearQuestionTopic(topicId);
    await db.collection('topics').doc(topicId).remove();

    return {
      success: true,
      message: '专题删除成功',
      data: {
        affectedQuestions
      }
    };
  } catch (error) {
    console.error('[adminDeleteTopic] error', error);
    return {
      success: false,
      message: '删除专题失败',
      error: error.message
    };
  }
};
