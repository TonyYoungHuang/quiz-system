// 云函数入口文件
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;

// 云函数入口函数
exports.main = async (event, context) => {
  const { token } = event;

  try {
    // 验证token
    const tokenResult = await db.collection('admin_tokens')
      .where({ token: token })
      .get();

    if (tokenResult.data.length === 0) {
      return {
        success: false,
        message: '???????????'
      };
    }

    const tokenData = tokenResult.data[0];
    if (tokenData.expiresAt) {
      const exp = new Date(tokenData.expiresAt).getTime();
      if (!Number.isNaN(exp) && exp <= Date.now()) {
        await db.collection('admin_tokens').doc(tokenData._id).remove();
        return {
          success: false,
          message: '???????????'
        };
      }
    }

    // 获取统计数据
    const [
      examCount,
      questionCount,
      codeCount,
      usedCodeCount,
      userPermissionCount
    ] = await Promise.all([
      db.collection('exams').count(),
      db.collection('questions').count(),
      db.collection('activation_codes').count(),
      db.collection('activation_codes').where({ isUsed: true }).count(),
      db.collection('user_permissions').count()
    ]);

    return {
      success: true,
      data: {
        examCount: examCount.total || 0,
        questionCount: questionCount.total || 0,
        codeCount: codeCount.total || 0,
        usedCodeCount: usedCodeCount.total || 0,
        unusedCodeCount: (codeCount.total || 0) - (usedCodeCount.total || 0),
        userPermissionCount: userPermissionCount.total || 0
      }
    };
  } catch (error) {
    console.error('获取统计数据失败:', error);
    return {
      success: false,
      message: '获取统计数据失败',
      error: error.message
    };
  }
};
