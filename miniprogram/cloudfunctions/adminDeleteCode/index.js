const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

async function validateAdminToken(token) {
  if (!token) {
    return {
      valid: false,
      message: '未提供登录令牌'
    };
  }

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

exports.main = async (event = {}) => {
  try {
    const auth = await validateAdminToken(event.token);
    if (!auth.valid) {
      return {
        success: false,
        message: auth.message
      };
    }

    const { codeId } = event;
    if (!codeId) {
      return {
        success: false,
        message: '未提供激活码 ID'
      };
    }

    const codeResult = await db.collection('activation_codes').doc(codeId).get();
    if (!codeResult.data) {
      return {
        success: false,
        message: '激活码不存在'
      };
    }

    const code = codeResult.data;
    if (code.isUsed) {
      return {
        success: false,
        message: '不能删除已使用的激活码'
      };
    }

    await db.collection('activation_codes').doc(codeId).remove();

    return {
      success: true,
      data: {
        code: code.code,
        batchNo: code.batchNo || '',
        message: '激活码删除成功'
      }
    };
  } catch (error) {
    console.error('[adminDeleteCode] error', error);
    return {
      success: false,
      message: '删除激活码失败',
      error: error.message
    };
  }
};
