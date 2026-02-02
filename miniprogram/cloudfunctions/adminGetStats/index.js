// 浜戝嚱鏁板叆鍙ｆ枃浠?
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;

// 浜戝嚱鏁板叆鍙ｅ嚱鏁?
exports.main = async (event, context) => {
  const { token } = event;

  try {
    // 楠岃瘉token
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

    // 鑾峰彇缁熻鏁版嵁
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
    console.error('鑾峰彇缁熻鏁版嵁澶辫触:', error);
    return {
      success: false,
      message: '鑾峰彇缁熻鏁版嵁澶辫触',
      error: error.message
    };
  }
};
