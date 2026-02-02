// 浜戝嚱鏁板叆鍙ｆ枃浠?
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

// 浜戝嚱鏁板叆鍙ｅ嚱鏁?
exports.main = async (event, context) => {
  const { token, examId, limit = 100, offset = 0 } = event;

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

    // 鏋勫缓鏌ヨ鏉′欢
    let query = db.collection('activation_codes');

    if (examId) {
      query = query.where({ examId: examId });
    }

    // 鑾峰彇鎬绘暟
    const countResult = await query.count();

    // 鑾峰彇鍒楄〃
    const result = await query
      .orderBy('createdAt', 'desc')
      .skip(offset)
      .limit(limit)
      .get();

    // 鑾峰彇鍏宠仈鐨勭鐩俊鎭?
    const codes = await Promise.all(result.data.map(async (code) => {
      const exam = await db.collection('exams')
        .doc(code.examId)
        .get();

      return {
        ...code,
        examName: exam.data ? exam.data.name : '鏈煡绉戠洰'
      };
    }));

    return {
      success: true,
      data: {
        list: codes,
        total: countResult.total || 0
      }
    };
  } catch (error) {
    console.error('鑾峰彇婵€娲荤爜鍒楄〃澶辫触:', error);
    return {
      success: false,
      message: '鑾峰彇婵€娲荤爜鍒楄〃澶辫触',
      error: error.message
    };
  }
};
