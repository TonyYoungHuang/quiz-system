// 云函数入口文件
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;

// 云函数入口函数
exports.main = async (event, context) => {
  const { userId, examId } = event;

  if (!userId || !examId) {
    return {
      success: false,
      message: '缺少必要参数'
    };
  }

  try {
    const result = await db.collection('user_permissions')
      .where({
        userId: userId,
        examId: examId
      })
      .get();

    if (result.data.length === 0) {
      return {
        success: false,
        hasPermission: false,
        message: '无权限'
      };
    }

    const permission = result.data[0];

    // 检查权限是否有效
    const isValid = permission.isPermanent ||
                    (permission.expiresAt && new Date(permission.expiresAt) > new Date());

    return {
      success: true,
      hasPermission: isValid,
      data: permission
    };
  } catch (error) {
    console.error('检查权限失败:', error);
    return {
      success: false,
      message: '检查权限失败',
      error: error.message
    };
  }
};
