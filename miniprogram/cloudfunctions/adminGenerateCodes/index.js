const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

const VALID_SOURCES = ['MANUAL', 'XHS', 'TB', 'PDD', 'XY'];
const DUPLICATE_CODE_ERRORS = ['duplicate', '唯一', 'exists', '-501001'];

function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function generateBatchNo() {
  const now = new Date();
  const stamp = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
    String(now.getHours()).padStart(2, '0'),
    String(now.getMinutes()).padStart(2, '0'),
    String(now.getSeconds()).padStart(2, '0')
  ].join('');
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `B${stamp}${suffix}`;
}

function isDuplicateCodeError(error) {
  const message = String((error && (error.message || error.errMsg || error.errCode)) || '');
  return DUPLICATE_CODE_ERRORS.some(flag => message.includes(flag));
}

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

async function createSingleCodeRecord({ examId, source, batchNo, remark }) {
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = generateCode();

    try {
      await db.collection('activation_codes').add({
        data: {
          code,
          examId,
          isUsed: false,
          userId: '',
          source,
          batchNo,
          remark,
          createdAt: new Date(),
          usedAt: null
        }
      });

      return code;
    } catch (error) {
      if (!isDuplicateCodeError(error)) {
        throw error;
      }
    }
  }

  throw new Error('生成激活码时发生重复冲突，请重试');
}

exports.main = async (event = {}) => {
  const { token, examId } = event;
  const count = parseInt(event.count, 10);
  const source = VALID_SOURCES.includes(event.source) ? event.source : 'MANUAL';
  const remark = typeof event.remark === 'string' ? event.remark.trim().slice(0, 100) : '';

  try {
    const auth = await validateAdminToken(token);
    if (!auth.valid) {
      return {
        success: false,
        message: auth.message
      };
    }

    if (!examId) {
      return {
        success: false,
        message: '请选择科目'
      };
    }

    if (!Number.isInteger(count) || count < 1 || count > 100) {
      return {
        success: false,
        message: '生成数量必须在 1 到 100 之间'
      };
    }

    const examResult = await db.collection('exams').doc(examId).get();
    if (!examResult.data) {
      return {
        success: false,
        message: '科目不存在'
      };
    }

    const batchNo = generateBatchNo();
    const codes = [];

    for (let i = 0; i < count; i++) {
      const code = await createSingleCodeRecord({
        examId,
        source,
        batchNo,
        remark
      });
      codes.push(code);
    }

    return {
      success: true,
      message: `成功生成 ${codes.length} 个激活码`,
      data: {
        count: codes.length,
        codes,
        batchNo,
        source,
        remark,
        examId,
        examName: examResult.data.name || ''
      }
    };
  } catch (error) {
    console.error('[adminGenerateCodes] error', error);
    return {
      success: false,
      message: '生成激活码失败',
      error: error.message
    };
  }
};
