// 云函数入口文件
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

// 云函数入口函数
exports.main = async (event, context) => {
  const { token, examId, limit = 100, offset = 0 } = event;

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

    // 构建查询条件
    let query = db.collection('activation_codes');

    if (examId) {
      query = query.where({ examId: examId });
    }

    // 获取总数
    const countResult = await query.count();

    // 获取列表
    const result = await query
      .orderBy('createdAt', 'desc')
      .skip(offset)
      .limit(limit)
      .get();

    // 获取关联的科目信息
    const codes = await Promise.all(result.data.map(async (code) => {
      const exam = await db.collection('exams')
        .doc(code.examId)
        .get();

      return {
        ...code,
        examName: exam.data ? exam.data.name : '未知科目'
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
    console.error('获取激活码列表失败:', error);
    return {
      success: false,
      message: '获取激活码列表失败',
      error: error.message
    };
  }
};
