// 浜戝嚱鏁板叆鍙ｆ枃浠?
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

// 浜戝嚱鏁板叆鍙ｅ嚱鏁?
exports.main = async (event, context) => {
  const { token, name, category, icon, sortOrder } = event;

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

    // 鐢熸垚绉戠洰ID
    const _id = 'exam_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);

    // 鍒涘缓绉戠洰
    await db.collection('exams').add({
      data: {
        _id: _id,
        name: name,
        category: category || '榛樿鍒嗙被',
        icon: icon || '馃摎',
        sortOrder: sortOrder || 0,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });

    return {
      success: true,
      message: '绉戠洰鍒涘缓鎴愬姛',
      data: {
        _id: _id
      }
    };
  } catch (error) {
    console.error('鍒涘缓绉戠洰澶辫触:', error);
    return {
      success: false,
      message: '鍒涘缓绉戠洰澶辫触',
      error: error.message
    };
  }
};
