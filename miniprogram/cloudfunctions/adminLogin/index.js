// 云函数入口文件
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;

// 云函数入口函数
exports.main = async (event, context) => {
  const { password } = event;

  if (!password) {
    return {
      success: false,
      message: '请输入密码'
    };
  }

  try {
    // 从配置集合获取管理员密码
    const configResult = await db.collection('config')
      .where({
        key: 'admin_password'
      })
      .get();

    if (configResult.data.length === 0) {
      // 首次使用，创建默认密码：admin123
      await db.collection('config').add({
        data: {
          key: 'admin_password',
          value: 'admin123',
          updatedAt: new Date()
        }
      });
    }

    const storedPassword = configResult.data.length > 0
      ? configResult.data[0].value
      : 'admin123';

    if (password === storedPassword) {
      // 生成登录token（使用时间戳）
      const token = 'admin_' + Date.now();

      // 存储token到数据库，有效期2小时
      await db.collection('admin_tokens').add({
        data: {
          token: token,
          createdAt: new Date(),
          expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000) // 2小时后过期
        }
      });

      return {
        success: true,
        message: '登录成功',
        data: {
          token: token
        }
      };
    } else {
      return {
        success: false,
        message: '密码错误'
      };
    }
  } catch (error) {
    console.error('登录失败:', error);
    return {
      success: false,
      message: '登录失败',
      error: error.message
    };
  }
};
