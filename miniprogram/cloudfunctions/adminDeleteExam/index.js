// 浜戝嚱鏁板叆鍙ｆ枃浠?
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;

/**
 * 鍒犻櫎绉戠洰浜戝嚱鏁?
 * 绾ц仈鍒犻櫎锛氬垹闄ょ鐩強鍏舵墍鏈夐鐩€佹縺娲荤爜銆佺敤鎴锋潈闄?
 */
exports.main = async (event, context) => {
  const { token, examId } = event;

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
  if (!examId) {
    return { success: false, error: '鏈彁渚涚鐩?ID' };
  }

  // 4. 鏌ヨ绉戠洰鏄惁瀛樺湪
  const examResult = await db.collection('exams')
    .doc(examId)
    .get();

  if (!examResult.data) {
    return { success: false, error: '绉戠洰涓嶅瓨鍦? };
  }

  const exam = examResult.data;

  // 5. 缁熻灏嗗垹闄ょ殑鏁版嵁
  let deletedQuestions = 0;
  let deletedCodes = 0;
  let deletedPermissions = 0;

  try {
    // 6. 鍒犻櫎璇ョ鐩笅鐨勬墍鏈夐鐩?
    const questionsResult = await db.collection('questions')
      .where({ examId: examId })
      .get();

    const questions = questionsResult.data;
    deletedQuestions = questions.length;

    for (const q of questions) {
      await db.collection('questions').doc(q._id).remove();
    }

    // 7. 鍒犻櫎璇ョ鐩笅鐨勬墍鏈夋縺娲荤爜
    const codesResult = await db.collection('activation_codes')
      .where({ examId: examId })
      .get();

    const codes = codesResult.data;
    deletedCodes = codes.length;

    for (const c of codes) {
      await db.collection('activation_codes').doc(c._id).remove();
    }

    // 8. 鍒犻櫎璇ョ鐩笅鐨勬墍鏈夌敤鎴锋潈闄?
    const permissionsResult = await db.collection('user_permissions')
      .where({ examId: examId })
      .get();

    const permissions = permissionsResult.data;
    deletedPermissions = permissions.length;

    for (const p of permissions) {
      await db.collection('user_permissions').doc(p._id).remove();
    }

    // 9. 鏈€鍚庡垹闄ょ鐩?
    await db.collection('exams').doc(examId).remove();

    return {
      success: true,
      data: {
        message: '绉戠洰鍒犻櫎鎴愬姛',
        deleted: {
          questions: deletedQuestions,
          codes: deletedCodes,
          permissions: deletedPermissions
        }
      }
    };
  } catch (err) {
    console.error('鍒犻櫎绉戠洰澶辫触锛?, err);
    return { success: false, error: '鍒犻櫎绉戠洰澶辫触锛? + err.message };
  }
};
