// 云函数入口文件
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;

// 云函数入口函数
exports.main = async (event, context) => {
  const { userId } = event;

  if (!userId) {
    return {
      success: false,
      message: '缺少userId参数'
    };
  }

  try {
    const permissionsResult = await db.collection('user_permissions')
      .where({
        userId: userId
      })
      .get();

    const permissions = permissionsResult.data;

    // 获取有效的权限
    const validPermissions = [];

    for (const permission of permissions) {
      // 检查权限是否有效
      const isValid = permission.isPermanent ||
                      (permission.expiresAt && new Date(permission.expiresAt) > new Date());

      if (isValid) {
        // 获取关联的考试科目信息
        const examResult = await db.collection('exams')
          .doc(permission.examId)
          .get();

        if (examResult.data) {
          validPermissions.push({
            ...permission,
            examId: examResult.data
          });
        }
      }
    }

    return {
      success: true,
      data: validPermissions
    };
  } catch (error) {
    console.error('获取权限列表失败:', error);
    return {
      success: false,
      message: '获取权限列表失败',
      error: error.message
    };
  }
};
