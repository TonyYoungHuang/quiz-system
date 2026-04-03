const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

async function ensureDefaultAdminPassword() {
  const configResult = await db.collection('config')
    .where({ key: 'admin_password' })
    .get();

  if (configResult.data.length > 0) {
    return String(configResult.data[0].value || 'admin123');
  }

  await db.collection('config').add({
    data: {
      key: 'admin_password',
      value: 'admin123',
      updatedAt: new Date()
    }
  });

  return 'admin123';
}

async function clearExpiredTokens() {
  const now = Date.now();
  const tokenResult = await db.collection('admin_tokens').get();

  for (const item of tokenResult.data) {
    const expiresAt = new Date(item.expiresAt).getTime();
    if (!Number.isNaN(expiresAt) && expiresAt <= now) {
      await db.collection('admin_tokens').doc(item._id).remove();
    }
  }
}

exports.main = async (event = {}) => {
  const password = String(event.password || '').trim();

  if (!password) {
    return {
      success: false,
      message: '请输入管理员密码'
    };
  }

  try {
    await clearExpiredTokens();

    const storedPassword = await ensureDefaultAdminPassword();
    if (password !== storedPassword) {
      return {
        success: false,
        message: '密码错误'
      };
    }

    const token = `admin_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    await db.collection('admin_tokens').add({
      data: {
        token,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000)
      }
    });

    return {
      success: true,
      message: '登录成功',
      data: {
        token
      }
    };
  } catch (error) {
    console.error('[adminLogin] error', error);
    return {
      success: false,
      message: '登录失败',
      error: error.message
    };
  }
};
