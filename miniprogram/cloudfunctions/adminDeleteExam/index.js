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

async function removeByExamId(collectionName, examId) {
  let deletedCount = 0;

  while (true) {
    const result = await db.collection(collectionName)
      .where({ examId })
      .limit(100)
      .get();

    if (!result.data.length) {
      break;
    }

    for (const item of result.data) {
      await db.collection(collectionName).doc(item._id).remove();
      deletedCount += 1;
    }
  }

  return deletedCount;
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

    const examId = event.examId;
    if (!examId) {
      return {
        success: false,
        message: '未提供科目 ID'
      };
    }

    const examResult = await db.collection('exams').doc(examId).get();
    if (!examResult.data) {
      return {
        success: false,
        message: '科目不存在'
      };
    }

    const exam = examResult.data;
    const [deletedQuestions, deletedCodes, deletedPermissions] = await Promise.all([
      removeByExamId('questions', examId),
      removeByExamId('activation_codes', examId),
      removeByExamId('user_permissions', examId)
    ]);

    await db.collection('exams').doc(examId).remove();

    return {
      success: true,
      message: '科目删除成功',
      data: {
        examId,
        examName: exam.name || '',
        deleted: {
          questions: deletedQuestions,
          codes: deletedCodes,
          permissions: deletedPermissions
        }
      }
    };
  } catch (error) {
    console.error('[adminDeleteExam] error', error);
    return {
      success: false,
      message: '删除科目失败',
      error: error.message
    };
  }
};
