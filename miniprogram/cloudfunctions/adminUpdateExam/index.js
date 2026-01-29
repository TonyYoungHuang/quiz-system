// 云函数入口文件
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

/**
 * 更新科目云函数
 * 验证管理员权限后更新科目信息
 */
exports.main = async (event, context) => {
  const { token, examId, name, category, icon, sortOrder } = event;

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
  if (!examId) {
    return { success: false, error: '未提供科目 ID' };
  }

  if (!name || name.trim() === '') {
    return { success: false, error: '科目名称不能为空' };
  }

  // 4. 查询科目是否存在
  const examResult = await db.collection('exams')
    .doc(examId)
    .get();

  if (!examResult.data) {
    return { success: false, error: '科目不存在' };
  }

  // 5. 构建更新数据
  const updateData = {
    name: name.trim(),
    category: category ? category.trim() : '',
    icon: icon ? icon.trim() : '📚',
    sortOrder: sortOrder !== undefined ? parseInt(sortOrder) : 0,
    updatedAt: new Date()
  };

  // 6. 更新科目
  try {
    await db.collection('exams').doc(examId).update({
      data: updateData
    });

    // 7. 查询该科目的题目数量
    const countResult = await db.collection('questions')
      .where({ examId: examId })
      .count();

    return {
      success: true,
      data: {
        message: '科目更新成功',
        exam: {
          _id: examId,
          ...updateData
        },
        questionCount: countResult.total
      }
    };
  } catch (err) {
    console.error('更新科目失败：', err);
    return { success: false, error: '更新科目失败：' + err.message };
  }
};
