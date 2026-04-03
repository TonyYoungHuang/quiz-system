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

    const result = await db.collection('exams')
      .orderBy('sortOrder', 'asc')
      .orderBy('createdAt', 'desc')
      .get();

    const exams = await Promise.all(result.data.map(async (exam) => {
      const [questionCount, codeCount, permissionCount] = await Promise.all([
        db.collection('questions').where({ examId: exam._id }).count(),
        db.collection('activation_codes').where({ examId: exam._id }).count(),
        db.collection('user_permissions').where({ examId: exam._id }).count()
      ]);

      return {
        ...exam,
        isActive: exam.isActive !== false,
        statusText: exam.isActive === false ? '已停用' : '已启用',
        questionCount: questionCount.total || 0,
        codeCount: codeCount.total || 0,
        permissionCount: permissionCount.total || 0,
        createdAtText: formatDateTime(exam.createdAt),
        updatedAtText: formatDateTime(exam.updatedAt)
      };
    }));

    return {
      success: true,
      data: exams
    };
  } catch (error) {
    console.error('[adminGetExams] error', error);
    return {
      success: false,
      message: '获取科目列表失败',
      error: error.message
    };
  }
};
