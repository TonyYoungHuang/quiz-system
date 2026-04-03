const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

function getCurrentUserId(event = {}) {
  const wxContext = cloud.getWXContext();
  return wxContext.OPENID || event.userId || '';
}

exports.main = async (event = {}) => {
  const { examId } = event;
  const userId = getCurrentUserId(event);

  if (!userId || !examId) {
    return {
      success: false,
      message: '缺少必要参数'
    };
  }

  try {
    const result = await db.collection('user_permissions')
      .where({
        userId,
        examId
      })
      .get();

    if (result.data.length === 0) {
      return {
        success: true,
        hasPermission: false
      };
    }

    const permission = result.data[0];
    const isValid = permission.isPermanent ||
      (permission.expiresAt && new Date(permission.expiresAt) > new Date());

    return {
      success: true,
      hasPermission: isValid,
      data: permission
    };
  } catch (error) {
    console.error('[checkPermission] error', error);
    return {
      success: false,
      message: '检查权限失败',
      error: error.message
    };
  }
};
