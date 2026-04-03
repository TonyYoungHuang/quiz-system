const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

async function validateAdminToken(token) {
  const tokenResult = await db.collection('admin_tokens').where({ token }).get();
  if (tokenResult.data.length === 0) {
    return { valid: false, message: '登录状态无效，请重新登录' };
  }

  const tokenData = tokenResult.data[0];
  if (tokenData.expiresAt) {
    const expiresAt = new Date(tokenData.expiresAt).getTime();
    if (!Number.isNaN(expiresAt) && expiresAt <= Date.now()) {
      await db.collection('admin_tokens').doc(tokenData._id).remove();
      return { valid: false, message: '登录已过期，请重新登录' };
    }
  }

  return { valid: true, tokenData };
}

async function clearQuestionPaper(paperId) {
  let affected = 0;
  while (true) {
    const batch = await db.collection('questions')
      .where({ paperId })
      .limit(100)
      .get();

    if (!batch.data.length) break;

    for (const question of batch.data) {
      await db.collection('questions').doc(question._id).update({
        data: { paperId: '' }
      });
      affected += 1;
    }
  }
  return affected;
}

exports.main = async (event = {}) => {
  try {
    const auth = await validateAdminToken(event.token);
    if (!auth.valid) return { success: false, message: auth.message };

    const paperId = event.paperId;
    if (!paperId) return { success: false, message: '未提供试卷 ID' };

    const paperResult = await db.collection('papers').doc(paperId).get().catch(() => ({ data: null }));
    if (!paperResult.data) return { success: false, message: '试卷不存在' };

    const affectedQuestions = await clearQuestionPaper(paperId);
    await db.collection('papers').doc(paperId).remove();

    return {
      success: true,
      message: '试卷删除成功',
      data: { affectedQuestions }
    };
  } catch (error) {
    console.error('[adminDeletePaper] error', error);
    return {
      success: false,
      message: '删除试卷失败',
      error: error.message
    };
  }
};
