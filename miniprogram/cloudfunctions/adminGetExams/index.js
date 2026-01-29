// 云函数入口文件
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

// 云函数入口函数
exports.main = async (event, context) => {
  const { token } = event;

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

    // 获取所有科目
    const result = await db.collection('exams')
      .orderBy('sortOrder', 'asc')
      .orderBy('createdAt', 'desc')
      .get();

    // 为每个科目统计题目数量
    const exams = await Promise.all(result.data.map(async (exam) => {
      const questionCount = await db.collection('questions')
        .where({ examId: exam._id })
        .count();

      return {
        ...exam,
        questionCount: questionCount.total || 0
      };
    }));

    return {
      success: true,
      data: exams
    };
  } catch (error) {
    console.error('获取科目列表失败:', error);
    return {
      success: false,
      message: '获取科目列表失败',
      error: error.message
    };
  }
};
