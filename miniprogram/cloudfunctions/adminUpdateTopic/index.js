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
    const name = String(event.name || '').trim();
    const parentId = event.parentId || '';
    const order = Number.isFinite(Number(event.order)) ? parseInt(event.order, 10) : 0;
    const isActive = event.isActive !== false;

    if (!topicId) {
      return {
        success: false,
        message: '未提供专题 ID'
      };
    }

    if (!name) {
      return {
        success: false,
        message: '专题名称不能为空'
      };
    }

    const topicResult = await db.collection('topics').doc(topicId).get().catch(() => ({ data: null }));
    if (!topicResult.data) {
      return {
        success: false,
        message: '专题不存在'
      };
    }

    const topic = topicResult.data;
    if (parentId && parentId === topicId) {
      return {
        success: false,
        message: '上级专题不能选择自己'
      };
    }

    if (parentId) {
      const parentResult = await db.collection('topics').doc(parentId).get().catch(() => ({ data: null }));
      if (!parentResult.data || parentResult.data.examId !== topic.examId) {
        return {
          success: false,
          message: '上级专题不存在或不属于当前科目'
        };
      }
    }

    const duplicateResult = await db.collection('topics')
      .where({
        examId: topic.examId,
        name,
        parentId: parentId || ''
      })
      .get();

    const duplicated = duplicateResult.data.find(item => item._id !== topicId);
    if (duplicated) {
      return {
        success: false,
        message: '同级专题名称已存在'
      };
    }

    await db.collection('topics').doc(topicId).update({
      data: {
        name,
        parentId: parentId || '',
        order,
        isActive,
        updatedAt: new Date()
      }
    });

    return {
      success: true,
      message: '专题更新成功'
    };
  } catch (error) {
    console.error('[adminUpdateTopic] error', error);
    return {
      success: false,
      message: '更新专题失败',
      error: error.message
    };
  }
};
