// 浜戝嚱鏁板叆鍙ｆ枃浠?
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

/**
 * 鑾峰彇棰樼洰鍒楄〃浜戝嚱鏁帮紙绠＄悊鐗堬級
 * 鏀寔鍒嗛〉銆佹寜绉戠洰绛涢€夈€佹寜棰樺瀷绛涢€?
 */
exports.main = async (event, context) => {
  const { token, examId, questionType, page = 1, pageSize = 50 } = event;

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

  // 2.  妫€鏌?token 鏄惁杩囨湡
  if (new Date(tokenData.expiresAt) < new Date()) {
    await db.collection('admin_tokens').doc(tokenData._id).remove();
    return { success: false, error: '鐧诲綍浠ょ墝宸茶繃鏈燂紝璇烽噸鏂扮櫥褰? };
  }

  // 3. 鏋勫缓鏌ヨ鏉′欢
  let whereCondition = {};

  if (examId) {
    whereCondition.examId = examId;
  }

  if (questionType) {
    whereCondition.type = questionType;
  }

  // 4. 鏌ヨ鎬绘暟
  const countResult = await db.collection('questions')
    .where(whereCondition)
    .count();

  const total = countResult.total;

  // 5. ????????
  const skip = (page - 1) * pageSize;
  const query = db.collection('questions').where(whereCondition);
  const pageResult = await query.skip(skip).limit(pageSize).get();
  let questions = pageResult.data || [];

  // 6.  鑾峰彇绉戠洰鍚嶇О锛堝鏋滄寜绉戠洰绛涢€夛級
  let examName = null;
  if (examId) {
    try {
      const examResult = await db.collection('exams')
        .doc(examId)
        .get();
      if (examResult.data) {
        examName = examResult.data.name;
      }
    } catch (err) {
      console.error('鑾峰彇绉戠洰鍚嶇О澶辫触锛?, err);
    }
  }

  return {
    success: true,
    data: {
      questions: questions,
      total: total,
      page: page,
      pageSize: pageSize,
      totalPages: Math.ceil(total / pageSize),
      examName: examName
    }
  };
};
