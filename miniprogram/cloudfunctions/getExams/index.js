// 浜戝嚱鏁板叆鍙ｆ枃浠?const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;

// 浜戝嚱鏁板叆鍙ｅ嚱鏁?exports.main = async (event, context) => {
  const { category } = event;

  try {
    let query = db.collection('exams');

    // 濡傛灉鎸囧畾浜嗗垎绫伙紝娣诲姞鍒嗙被绛涢€?    if (category) {
      query = query.where({
        category: category
      });
    }

    const result = await query
      .orderBy('sortOrder', 'asc')
      .get();

    return {
      success: true,
      data: result.data
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
