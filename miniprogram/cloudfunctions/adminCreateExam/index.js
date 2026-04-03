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

function normalizeInput(event = {}) {
  const category = typeof event.category === 'string' ? event.category.trim() : '';
  const icon = typeof event.icon === 'string' ? event.icon.trim() : '';
  return {
    name: typeof event.name === 'string' ? event.name.trim() : '',
    category: category || '默认分类',
    icon: icon || '📚',
    sortOrder: Number.isFinite(Number(event.sortOrder)) ? parseInt(event.sortOrder, 10) : 0,
    isActive: event.isActive !== false
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

    const payload = normalizeInput(event);
    if (!payload.name) {
      return {
        success: false,
        message: '科目名称不能为空'
      };
    }

    const duplicateResult = await db.collection('exams')
      .where({ name: payload.name })
      .get();

    if (duplicateResult.data.length > 0) {
      return {
        success: false,
        message: '科目名称已存在'
      };
    }

    const now = new Date();
    const createResult = await db.collection('exams').add({
      data: {
        ...payload,
        createdAt: now,
        updatedAt: now
      }
    });

    return {
      success: true,
      message: '科目创建成功',
      data: {
        _id: createResult._id,
        exam: {
          _id: createResult._id,
          ...payload,
          createdAt: now,
          updatedAt: now
        }
      }
    };
  } catch (error) {
    console.error('[adminCreateExam] error', error);
    return {
      success: false,
      message: '创建科目失败',
      error: error.message
    };
  }
};
