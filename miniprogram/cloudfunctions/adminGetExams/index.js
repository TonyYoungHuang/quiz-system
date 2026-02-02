// 浜戝嚱鏁板叆鍙ｆ枃浠?
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

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

    // 鑾峰彇鎵€鏈夌鐩?
    const result = await db.collection('exams')
      .orderBy('sortOrder', 'asc')
      .orderBy('createdAt', 'desc')
      .get();

    // 涓烘瘡涓鐩粺璁￠鐩暟閲?
    const exams = await Promise.all(result.data.map(async (exam) => {
      const questionCount = await db.collection('questions')
        .where({ examId: exam._id })
        .count();

      return {
        ...exam,
        questionCount: questionCount.total || 0
      };
    }));

    return {
      success: true,
      data: exams
    };
  } catch (error) {
    console.error('鑾峰彇绉戠洰鍒楄〃澶辫触:', error);
    return {
      success: false,
      message: '鑾峰彇绉戠洰鍒楄〃澶辫触',
      error: error.message
    };
  }
};
