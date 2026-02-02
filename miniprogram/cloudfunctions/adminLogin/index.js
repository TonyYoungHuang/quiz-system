// 浜戝嚱鏁板叆鍙ｆ枃浠?const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;

// 浜戝嚱鏁板叆鍙ｅ嚱鏁?exports.main = async (event, context) => {
  const { password } = event;

  if (!password) {
    return {
      success: false,
      message: '璇疯緭鍏ュ瘑鐮?
    };
  }

  try {
    // 浠庨厤缃泦鍚堣幏鍙栫鐞嗗憳瀵嗙爜
    const configResult = await db.collection('config')
      .where({
        key: 'admin_password'
      })
      .get();

    if (configResult.data.length === 0) {
      // 棣栨浣跨敤锛屽垱寤洪粯璁ゅ瘑鐮侊細admin123
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
      // 鐢熸垚鐧诲綍token锛堜娇鐢ㄦ椂闂存埑锛?      const token = 'admin_' + Date.now();

      // 瀛樺偍token鍒版暟鎹簱锛屾湁鏁堟湡2灏忔椂
      await db.collection('admin_tokens').add({
        data: {
          token: token,
          createdAt: new Date(),
          expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000) // 2灏忔椂鍚庤繃鏈?        }
      });

      return {
        success: true,
        message: '鐧诲綍鎴愬姛',
        data: {
          token: token
        }
      };
    } else {
      return {
        success: false,
        message: '瀵嗙爜閿欒'
      };
    }
  } catch (error) {
    console.error('鐧诲綍澶辫触:', error);
    return {
      success: false,
      message: '鐧诲綍澶辫触',
      error: error.message
    };
  }
};
