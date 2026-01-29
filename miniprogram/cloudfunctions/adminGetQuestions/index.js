// 云函数入口文件
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

/**
 * 获取题目列表云函数（管理版）
 * 支持分页、按科目筛选、按题型筛选
 */
exports.main = async (event, context) => {
  const { token, examId, questionType, page = 1, pageSize = 50 } = event;

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

  // 2.  检查 token 是否过期
  if (new Date(tokenData.expiresAt) < new Date()) {
    await db.collection('admin_tokens').doc(tokenData._id).remove();
    return { success: false, error: '登录令牌已过期，请重新登录' };
  }

  // 3. 构建查询条件
  let whereCondition = {};

  if (examId) {
    whereCondition.examId = examId;
  }

  if (questionType) {
    whereCondition.type = questionType;
  }

  // 4. 查询总数
  const countResult = await db.collection('questions')
    .where(whereCondition)
    .count();

  const total = countResult.total;

  // 5. ????????
  const skip = (page - 1) * pageSize;
  const query = db.collection('questions').where(whereCondition);
  const pageResult = await query.skip(skip).limit(pageSize).get();
  let questions = pageResult.data || [];

  // 6.  获取科目名称（如果按科目筛选）
  let examName = null;
  if (examId) {
    try {
      const examResult = await db.collection('exams')
        .doc(examId)
        .get();
      if (examResult.data) {
        examName = examResult.data.name;
      }
    } catch (err) {
      console.error('获取科目名称失败：', err);
    }
  }

  return {
    success: true,
    data: {
      questions: questions,
      total: total,
      page: page,
      pageSize: pageSize,
      totalPages: Math.ceil(total / pageSize),
      examName: examName
    }
  };
};
