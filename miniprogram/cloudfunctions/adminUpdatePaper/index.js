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

exports.main = async (event = {}) => {
  try {
    const auth = await validateAdminToken(event.token);
    if (!auth.valid) {
      return { success: false, message: auth.message };
    }

    const paperId = event.paperId;
    const title = String(event.title || '').trim();
    const year = parseInt(event.year, 10);
    const order = Number.isFinite(Number(event.order)) ? parseInt(event.order, 10) : 0;
    const isActive = event.isActive !== false;

    if (!paperId) return { success: false, message: '未提供试卷 ID' };
    if (!title) return { success: false, message: '试卷名称不能为空' };
    if (!Number.isInteger(year) || year < 2000 || year > 2100) {
      return { success: false, message: '年份格式不正确' };
    }

    const paperResult = await db.collection('papers').doc(paperId).get().catch(() => ({ data: null }));
    if (!paperResult.data) return { success: false, message: '试卷不存在' };
    const paper = paperResult.data;

    const duplicateResult = await db.collection('papers')
      .where({ examId: paper.examId, title, year })
      .get();
    const duplicated = duplicateResult.data.find(item => item._id !== paperId);
    if (duplicated) {
      return { success: false, message: '同名同年份试卷已存在' };
    }

    await db.collection('papers').doc(paperId).update({
      data: {
        title,
        year,
        order,
        isActive,
        updatedAt: new Date()
      }
    });

    return { success: true, message: '试卷更新成功' };
  } catch (error) {
    console.error('[adminUpdatePaper] error', error);
    return {
      success: false,
      message: '更新试卷失败',
      error: error.message
    };
  }
};
