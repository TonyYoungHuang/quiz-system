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

function normalizeMedia(rawMedia) {
  if (!Array.isArray(rawMedia)) return [];

  return rawMedia
    .map(item => {
      if (!item) return null;
      if (typeof item === 'string') {
        const url = item.trim();
        return url ? { type: 'image', url } : null;
      }
      const url = String(item.url || '').trim();
      if (!url) return null;
      return {
        type: String(item.type || 'image').trim() || 'image',
        url,
        caption: String(item.caption || '').trim()
      };
    })
    .filter(Boolean);
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

    const updateData = {
      updatedAt: new Date()
    };

    if (Array.isArray(event.media)) {
      updateData.media = normalizeMedia(event.media);
      updateData.needsMediaReview = updateData.media.length === 0;
    }

    if (typeof event.mediaReviewReason === 'string') {
      updateData.mediaReviewReason = event.mediaReviewReason.trim();
    }

    if (typeof event.mediaPrompt === 'string') {
      updateData.mediaPrompt = event.mediaPrompt.trim();
    }

    await db.collection('questions').doc(event.questionId).update({
      data: updateData
    });

    return {
      success: true,
      message: '题目更新成功',
      data: updateData
    };
  } catch (error) {
    console.error('[adminUpdateQuestion] error', error);
    return {
      success: false,
      message: '题目更新失败',
      error: error.message
    };
  }
};
