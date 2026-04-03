const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

async function validateAdminToken(token) {
  const tokenResult = await db.collection('admin_tokens')
    .where({ token })
    .get();

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

    const examId = event.examId;
    const title = String(event.title || '').trim();
    const year = parseInt(event.year, 10);
    const order = Number.isFinite(Number(event.order)) ? parseInt(event.order, 10) : 0;
    const isActive = event.isActive !== false;

    if (!examId) return { success: false, message: '请选择科目' };
    if (!title) return { success: false, message: '试卷名称不能为空' };
    if (!Number.isInteger(year) || year < 2000 || year > 2100) {
      return { success: false, message: '年份格式不正确' };
    }

    const examResult = await db.collection('exams').doc(examId).get().catch(() => ({ data: null }));
    if (!examResult.data) return { success: false, message: '科目不存在' };

    const duplicateResult = await db.collection('papers')
      .where({ examId, title, year })
      .get();
    if (duplicateResult.data.length > 0) {
      return { success: false, message: '同名同年份试卷已存在' };
    }

    const now = new Date();
    const createResult = await db.collection('papers').add({
      data: {
        examId,
        title,
        year,
        order,
        isActive,
        createdAt: now,
        updatedAt: now
      }
    });

    return {
      success: true,
      message: '试卷创建成功',
      data: { _id: createResult._id }
    };
  } catch (error) {
    console.error('[adminCreatePaper] error', error);
    return {
      success: false,
      message: '创建试卷失败',
      error: error.message
    };
  }
};
