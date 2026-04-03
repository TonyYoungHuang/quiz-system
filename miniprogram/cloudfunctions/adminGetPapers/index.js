const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;

async function validateAdminToken(token) {
  const tokenResult = await db.collection('admin_tokens')
    .where({ token })
    .get();

  if (tokenResult.data.length === 0) {
    return {
      valid: false,
      message: '登录状态无效，请重新登录'
    };
  }

  const tokenData = tokenResult.data[0];
  if (tokenData.expiresAt) {
    const expiresAt = new Date(tokenData.expiresAt).getTime();
    if (!Number.isNaN(expiresAt) && expiresAt <= Date.now()) {
      await db.collection('admin_tokens').doc(tokenData._id).remove();
      return {
        valid: false,
        message: '登录已过期，请重新登录'
      };
    }
  }

  return {
    valid: true,
    tokenData
  };
}

function formatDateTime(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString();
}

exports.main = async (event = {}) => {
  try {
    const auth = await validateAdminToken(event.token);
    if (!auth.valid) {
      return { success: false, message: auth.message };
    }

    const where = {};
    if (event.examId) where.examId = event.examId;

    const result = await db.collection('papers')
      .where(where)
      .orderBy('year', 'desc')
      .orderBy('order', 'asc')
      .orderBy('createdAt', 'asc')
      .get();

    const papers = await Promise.all((result.data || []).map(async (paper) => {
      const [examResult, questionCount] = await Promise.all([
        db.collection('exams').doc(paper.examId).get().catch(() => ({ data: null })),
        db.collection('questions').where({ paperId: paper._id }).count()
      ]);

      return {
        ...paper,
        isActive: paper.isActive !== false,
        statusText: paper.isActive === false ? '已停用' : '已启用',
        examName: examResult.data ? examResult.data.name || '' : '',
        questionCount: questionCount.total || 0,
        createdAtText: formatDateTime(paper.createdAt),
        updatedAtText: formatDateTime(paper.updatedAt)
      };
    }));

    return {
      success: true,
      data: papers
    };
  } catch (error) {
    console.error('[adminGetPapers] error', error);
    return {
      success: false,
      message: '获取试卷列表失败',
      error: error.message
    };
  }
};
