// 浜戝嚱鏁板叆鍙ｆ枃浠?
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

/**
 * 鍒犻櫎婵€娲荤爜浜戝嚱鏁?
 * 楠岃瘉绠＄悊鍛樻潈闄愬悗鍒犻櫎婵€娲荤爜锛堝彧鑳藉垹闄ゆ湭浣跨敤鐨勶級
 */
exports.main = async (event, context) => {
  const { token, codeId } = event;

  // 1. 楠岃瘉绠＄悊鍛樻潈闄?
  if (!token) {
    return { success: false, error: '鏈彁渚涚櫥褰曚护鐗? };
  }

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

  // 2. 妫€鏌?token 鏄惁杩囨湡
  if (new Date(tokenData.expiresAt) < new Date()) {
    await db.collection('admin_tokens').doc(tokenData._id).remove();
    return { success: false, error: '鐧诲綍浠ょ墝宸茶繃鏈燂紝璇烽噸鏂扮櫥褰? };
  }

  // 3. 楠岃瘉鍙傛暟
  if (!codeId) {
    return { success: false, error: '鏈彁渚涙縺娲荤爜 ID' };
  }

  // 4. 鏌ヨ婵€娲荤爜
  const codeResult = await db.collection('activation_codes')
    .doc(codeId)
    .get();

  if (!codeResult.data) {
    return { success: false, error: '婵€娲荤爜涓嶅瓨鍦? };
  }

  const code = codeResult.data;

  // 5. 鍙兘鍒犻櫎鏈娇鐢ㄧ殑婵€娲荤爜
  if (code.isUsed) {
    return { success: false, error: '涓嶈兘鍒犻櫎宸蹭娇鐢ㄧ殑婵€娲荤爜' };
  }

  // 6. 鍒犻櫎婵€娲荤爜
  try {
    await db.collection('activation_codes').doc(codeId).remove();
    return {
      success: true,
      data: {
        message: '婵€娲荤爜鍒犻櫎鎴愬姛'
      }
    };
  } catch (err) {
    console.error('鍒犻櫎婵€娲荤爜澶辫触锛?, err);
    return { success: false, error: '鍒犻櫎婵€娲荤爜澶辫触锛? + err.message };
  }
};
