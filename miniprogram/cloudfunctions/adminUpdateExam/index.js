// 浜戝嚱鏁板叆鍙ｆ枃浠?
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

/**
 * 鏇存柊绉戠洰浜戝嚱鏁?
 * 楠岃瘉绠＄悊鍛樻潈闄愬悗鏇存柊绉戠洰淇℃伅
 */
exports.main = async (event, context) => {
  const { token, examId, name, category, icon, sortOrder } = event;

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

  if (!name || name.trim() === '') {
    return { success: false, error: '绉戠洰鍚嶇О涓嶈兘涓虹┖' };
  }

  // 4. 鏌ヨ绉戠洰鏄惁瀛樺湪
  const examResult = await db.collection('exams')
    .doc(examId)
    .get();

  if (!examResult.data) {
    return { success: false, error: '绉戠洰涓嶅瓨鍦? };
  }

  // 5. 鏋勫缓鏇存柊鏁版嵁
  const updateData = {
    name: name.trim(),
    category: category ? category.trim() : '',
    icon: icon ? icon.trim() : '馃摎',
    sortOrder: sortOrder !== undefined ? parseInt(sortOrder) : 0,
    updatedAt: new Date()
  };

  // 6. 鏇存柊绉戠洰
  try {
    await db.collection('exams').doc(examId).update({
      data: updateData
    });

    // 7. 鏌ヨ璇ョ鐩殑棰樼洰鏁伴噺
    const countResult = await db.collection('questions')
      .where({ examId: examId })
      .count();

    return {
      success: true,
      data: {
        message: '绉戠洰鏇存柊鎴愬姛',
        exam: {
          _id: examId,
          ...updateData
        },
        questionCount: countResult.total
      }
    };
  } catch (err) {
    console.error('鏇存柊绉戠洰澶辫触锛?, err);
    return { success: false, error: '鏇存柊绉戠洰澶辫触锛? + err.message };
  }
};
