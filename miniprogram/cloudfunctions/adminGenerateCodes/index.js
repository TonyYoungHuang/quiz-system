// 浜戝嚱鏁板叆鍙ｆ枃浠?
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;

// 鐢熸垚闅忔満婵€娲荤爜
function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 鍘婚櫎鏄撴贩娣嗗瓧绗?
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// 浜戝嚱鏁板叆鍙ｅ嚱鏁?
exports.main = async (event, context) => {
  const { token, examId, count, source } = event;

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

    // 楠岃瘉examId鏄惁瀛樺湪
    const exam = await db.collection('exams')
      .doc(examId)
      .get();

    if (!exam.data) {
      return {
        success: false,
        message: '绉戠洰涓嶅瓨鍦?
      };
    }

    // 鎵归噺鐢熸垚婵€娲荤爜
    const codes = [];
    const batchSize = 20;

    for (let i = 0; i < count; i += batchSize) {
      const currentBatch = Math.min(batchSize, count - i);

      for (let j = 0; j < currentBatch; j++) {
        const code = generateCode();
        const _id = 'code_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);

        await db.collection('activation_codes').add({
          data: {
            _id: _id,
            code: code,
            examId: examId,
            isUsed: false,
            userId: '',
            source: source || 'MANUAL',
            createdAt: new Date(),
            usedAt: null
          }
        });

        codes.push(code);
      }
    }

    return {
      success: true,
      message: `鎴愬姛鐢熸垚 ${count} 涓縺娲荤爜`,
      data: {
        count: count,
        codes: codes
      }
    };
  } catch (error) {
    console.error('鐢熸垚婵€娲荤爜澶辫触:', error);
    return {
      success: false,
      message: '鐢熸垚婵€娲荤爜澶辫触',
      error: error.message
    };
  }
};
