// 浜戝嚱鏁板叆鍙ｆ枃浠?const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;

// 浜戝嚱鏁板叆鍙ｅ嚱鏁?exports.main = async (event, context) => {
  const { userId, examId } = event;

  if (!userId || !examId) {
    return {
      success: false,
      message: '缂哄皯蹇呰鍙傛暟'
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
        message: '鏃犳潈闄?
      };
    }

    const permission = result.data[0];

    // 妫€鏌ユ潈闄愭槸鍚︽湁鏁?    const isValid = permission.isPermanent ||
                    (permission.expiresAt && new Date(permission.expiresAt) > new Date());

    return {
      success: true,
      hasPermission: isValid,
      data: permission
    };
  } catch (error) {
    console.error('妫€鏌ユ潈闄愬け璐?', error);
    return {
      success: false,
      message: '妫€鏌ユ潈闄愬け璐?,
      error: error.message
    };
  }
};
