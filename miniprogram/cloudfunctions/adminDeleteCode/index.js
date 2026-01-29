// 云函数入口文件
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

/**
 * 删除激活码云函数
 * 验证管理员权限后删除激活码（只能删除未使用的）
 */
exports.main = async (event, context) => {
  const { token, codeId } = event;

  // 1. 验证管理员权限
  if (!token) {
    return { success: false, error: '未提供登录令牌' };
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

  const tokenData = tokenResult.data[0];

  // 2. 检查 token 是否过期
  if (new Date(tokenData.expiresAt) < new Date()) {
    await db.collection('admin_tokens').doc(tokenData._id).remove();
    return { success: false, error: '登录令牌已过期，请重新登录' };
  }

  // 3. 验证参数
  if (!codeId) {
    return { success: false, error: '未提供激活码 ID' };
  }

  // 4. 查询激活码
  const codeResult = await db.collection('activation_codes')
    .doc(codeId)
    .get();

  if (!codeResult.data) {
    return { success: false, error: '激活码不存在' };
  }

  const code = codeResult.data;

  // 5. 只能删除未使用的激活码
  if (code.isUsed) {
    return { success: false, error: '不能删除已使用的激活码' };
  }

  // 6. 删除激活码
  try {
    await db.collection('activation_codes').doc(codeId).remove();
    return {
      success: true,
      data: {
        message: '激活码删除成功'
      }
    };
  } catch (err) {
    console.error('删除激活码失败：', err);
    return { success: false, error: '删除激活码失败：' + err.message };
  }
};
