// 云函数入口文件
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;

// 云函数入口函数
exports.main = async (event, context) => {
  const { examId } = event;

  if (!examId) {
    return {
      success: false,
      message: '缺少examId参数'
    };
  }

  try {
    const result = await db.collection('questions')
      .where({
        examId: examId
      })
      .orderBy('sortOrder', 'asc')
      .get();

    return {
      success: true,
      data: result.data
    };
  } catch (error) {
    console.error('获取题目失败:', error);
    return {
      success: false,
      message: '获取题目失败',
      error: error.message
    };
  }
};
