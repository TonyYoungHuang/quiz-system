const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;

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

function chunkArray(items, size) {
  const result = [];
  for (let i = 0; i < items.length; i += size) {
    result.push(items.slice(i, i + size));
  }
  return result;
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

    const questionIds = Array.isArray(event.questionIds)
      ? event.questionIds.map(item => String(item || '').trim()).filter(Boolean)
      : [];

    if (!questionIds.length) {
      return {
        success: false,
        message: '缺少 questionIds'
      };
    }

    const uniqueIds = Array.from(new Set(questionIds));
    const chunks = chunkArray(uniqueIds, 20);
    let deletedCount = 0;

    for (const chunk of chunks) {
      const result = await db.collection('questions')
        .where({
          _id: _.in(chunk)
        })
        .remove();

      deletedCount += result.stats ? (result.stats.removed || 0) : 0;
    }

    return {
      success: true,
      message: '批量删除成功',
      data: {
        requestedCount: uniqueIds.length,
        deletedCount
      }
    };
  } catch (error) {
    console.error('[adminBatchDeleteQuestions] error', error);
    return {
      success: false,
      message: '批量删除失败',
      error: error.message
    };
  }
};
