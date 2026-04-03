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

function buildFilter(event = {}) {
  const where = {};

  if (event.examId) where.examId = event.examId;
  if (event.source) where.source = event.source;
  if (event.status === 'USED') where.isUsed = true;
  if (event.status === 'UNUSED') where.isUsed = false;

  return where;
}

function maskUserId(userId) {
  if (!userId) return '';
  if (userId.length <= 8) return userId;
  return `${userId.slice(0, 4)}****${userId.slice(-4)}`;
}

function formatDateTime(dateValue) {
  if (!dateValue) return '';
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString();
}

exports.main = async (event = {}) => {
  const limit = Math.max(1, Math.min(parseInt(event.limit, 10) || 20, 100));
  const offset = Math.max(0, parseInt(event.offset, 10) || 0);

  try {
    const auth = await validateAdminToken(event.token);
    if (!auth.valid) {
      return {
        success: false,
        message: auth.message
      };
    }

    const where = buildFilter(event);
    let query = db.collection('activation_codes');
    if (Object.keys(where).length > 0) {
      query = query.where(where);
    }

    const countResult = await query.count();
    const result = await query
      .orderBy('createdAt', 'desc')
      .skip(offset)
      .limit(limit)
      .get();

    const codes = await Promise.all(result.data.map(async (code) => {
      const exam = await db.collection('exams').doc(code.examId).get().catch(() => ({ data: null }));
      const usedInfo = code.isUsed
        ? `${maskUserId(code.userId)}${code.usedAt ? ` / ${formatDateTime(code.usedAt)}` : ''}`
        : '';

      return {
        ...code,
        examName: exam.data ? exam.data.name : '未知科目',
        statusText: code.isUsed ? '已使用' : '未使用',
        usedByMasked: maskUserId(code.userId),
        usedAtText: formatDateTime(code.usedAt),
        createdAtText: formatDateTime(code.createdAt),
        usedInfo
      };
    }));

    return {
      success: true,
      data: {
        list: codes,
        total: countResult.total || 0
      }
    };
  } catch (error) {
    console.error('[adminGetCodes] error', error);
    return {
      success: false,
      message: '获取激活码列表失败',
      error: error.message
    };
  }
};
