const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

function getCurrentUserId(event = {}) {
  const wxContext = cloud.getWXContext();
  return wxContext.OPENID || event.userId || '';
}

async function getExamById(examId) {
  if (!examId) return null;

  try {
    const result = await db.collection('exams').doc(examId).get();
    return result.data || null;
  } catch (error) {
    console.error('[activateCode] getExamById error', error);
    return null;
  }
}

exports.main = async (event = {}) => {
  const code = typeof event.code === 'string' ? event.code.trim().toUpperCase() : '';
  const requestedExamId = typeof event.examId === 'string' ? event.examId.trim() : '';
  const userId = getCurrentUserId(event);

  if (!code || !userId) {
    return {
      success: false,
      message: '缺少必要参数'
    };
  }

  try {
    const codeResult = await db.collection('activation_codes')
      .where({ code })
      .limit(1)
      .get();

    if (codeResult.data.length === 0) {
      return {
        success: false,
        message: '激活码不存在'
      };
    }

    const activationCode = codeResult.data[0];
    const actualExamId = activationCode.examId;

    if (!actualExamId) {
      return {
        success: false,
        message: '该激活码未绑定科目，请联系管理员处理'
      };
    }

    if (activationCode.isUsed) {
      return {
        success: false,
        message: '激活码已被使用'
      };
    }

    if (requestedExamId && requestedExamId !== actualExamId) {
      return {
        success: false,
        message: '激活码与当前科目不匹配'
      };
    }

    const existingPermission = await db.collection('user_permissions')
      .where({
        userId,
        examId: actualExamId
      })
      .limit(1)
      .get();

    if (existingPermission.data.length > 0) {
      const permission = existingPermission.data[0];
      const isValid = permission.isPermanent ||
        (permission.expiresAt && new Date(permission.expiresAt) > new Date());

      if (isValid) {
        return {
          success: false,
          message: '您已拥有该科目的权限'
        };
      }
    }

    const transaction = await db.startTransaction();

    try {
      await transaction.collection('activation_codes')
        .doc(activationCode._id)
        .update({
          data: {
            isUsed: true,
            userId,
            usedAt: new Date()
          }
        });

      await transaction.collection('user_permissions')
        .add({
          data: {
            userId,
            examId: actualExamId,
            isPermanent: true,
            createdAt: new Date()
          }
        });

      await transaction.commit();

      const exam = await getExamById(actualExamId);

      return {
        success: true,
        message: '激活成功',
        data: {
          userId,
          examId: actualExamId,
          examName: exam ? exam.name || '' : '',
          exam
        }
      };
    } catch (transactionError) {
      await transaction.rollback();
      throw transactionError;
    }
  } catch (error) {
    console.error('[activateCode] error', error);
    return {
      success: false,
      message: '激活失败，请稍后重试',
      error: error.message
    };
  }
};
