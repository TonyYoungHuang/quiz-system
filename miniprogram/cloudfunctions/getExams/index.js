// 云函数入口文件
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;

// 云函数入口函数
exports.main = async (event, context) => {
  const { category } = event;

  try {
    let query = db.collection('exams');

    // 如果指定了分类，添加分类筛选
    if (category) {
      query = query.where({
        category: category
      });
    }

    const result = await query
      .orderBy('sortOrder', 'asc')
      .get();

    return {
      success: true,
      data: result.data
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
