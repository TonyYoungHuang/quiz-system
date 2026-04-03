const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

async function validateAdminToken(token) {
  const tokenResult = await db.collection('admin_tokens')
    .where({ token })
    .get();

  if (!tokenResult.data.length) {
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

exports.main = async (event = {}) => {
  try {
    const auth = await validateAdminToken(event.token);
    if (!auth.valid) {
      return {
        success: false,
        message: auth.message
      };
    }

    if (!event.questionId) {
      return {
        success: false,
        message: '缺少 questionId'
      };
    }

    const questionResult = await db.collection('questions').doc(event.questionId).get().catch(() => ({ data: null }));
    if (!questionResult.data) {
      return {
        success: false,
        message: '题目不存在'
      };
    }

    await db.collection('questions').doc(event.questionId).remove();

    return {
      success: true,
      message: '题目删除成功',
      data: {
        questionId: event.questionId,
        examId: questionResult.data.examId || '',
        topicId: questionResult.data.topicId || '',
        paperId: questionResult.data.paperId || ''
      }
    };
  } catch (error) {
    console.error('[adminDeleteQuestion] error', error);
    return {
      success: false,
      message: '题目删除失败',
      error: error.message
    };
  }
};
