// 浜戝嚱鏁板叆鍙ｆ枃浠?const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;

// 浜戝嚱鏁板叆鍙ｅ嚱鏁?exports.main = async (event, context) => {
  const { userId } = event;

  if (!userId) {
    return {
      success: false,
      message: '缂哄皯userId鍙傛暟'
    };
  }

  try {
    const permissionsResult = await db.collection('user_permissions')
      .where({
        userId: userId
      })
      .get();

    const permissions = permissionsResult.data;

    // 鑾峰彇鏈夋晥鐨勬潈闄?    const validPermissions = [];

    for (const permission of permissions) {
      // 妫€鏌ユ潈闄愭槸鍚︽湁鏁?      const isValid = permission.isPermanent ||
                      (permission.expiresAt && new Date(permission.expiresAt) > new Date());

      if (isValid) {
        // 鑾峰彇鍏宠仈鐨勮€冭瘯绉戠洰淇℃伅
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
    console.error('鑾峰彇鏉冮檺鍒楄〃澶辫触:', error);
    return {
      success: false,
      message: '鑾峰彇鏉冮檺鍒楄〃澶辫触',
      error: error.message
    };
  }
};
