// 云函数入口文件
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;

// 生成随机激活码
function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 去除易混淆字符
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// 云函数入口函数
exports.main = async (event, context) => {
  const { token, examId, count, source } = event;

  try {
    // 验证token
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

    // 验证examId是否存在
    const exam = await db.collection('exams')
      .doc(examId)
      .get();

    if (!exam.data) {
      return {
        success: false,
        message: '科目不存在'
      };
    }

    // 批量生成激活码
    const codes = [];
    const batchSize = 20;

    for (let i = 0; i < count; i += batchSize) {
      const currentBatch = Math.min(batchSize, count - i);

      for (let j = 0; j < currentBatch; j++) {
        const code = generateCode();
        const _id = 'code_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);

        await db.collection('activation_codes').add({
          data: {
            _id: _id,
            code: code,
            examId: examId,
            isUsed: false,
            userId: '',
            source: source || 'MANUAL',
            createdAt: new Date(),
            usedAt: null
          }
        });

        codes.push(code);
      }
    }

    return {
      success: true,
      message: `成功生成 ${count} 个激活码`,
      data: {
        count: count,
        codes: codes
      }
    };
  } catch (error) {
    console.error('生成激活码失败:', error);
    return {
      success: false,
      message: '生成激活码失败',
      error: error.message
    };
  }
};
