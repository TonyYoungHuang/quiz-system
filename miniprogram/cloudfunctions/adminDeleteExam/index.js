// 云函数入口文件
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;

/**
 * 删除科目云函数
 * 级联删除：删除科目及其所有题目、激活码、用户权限
 */
exports.main = async (event, context) => {
  const { token, examId } = event;

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

  // 4. 查询科目是否存在
  const examResult = await db.collection('exams')
    .doc(examId)
    .get();

  if (!examResult.data) {
    return { success: false, error: '科目不存在' };
  }

  const exam = examResult.data;

  // 5. 统计将删除的数据
  let deletedQuestions = 0;
  let deletedCodes = 0;
  let deletedPermissions = 0;

  try {
    // 6. 删除该科目下的所有题目
    const questionsResult = await db.collection('questions')
      .where({ examId: examId })
      .get();

    const questions = questionsResult.data;
    deletedQuestions = questions.length;

    for (const q of questions) {
      await db.collection('questions').doc(q._id).remove();
    }

    // 7. 删除该科目下的所有激活码
    const codesResult = await db.collection('activation_codes')
      .where({ examId: examId })
      .get();

    const codes = codesResult.data;
    deletedCodes = codes.length;

    for (const c of codes) {
      await db.collection('activation_codes').doc(c._id).remove();
    }

    // 8. 删除该科目下的所有用户权限
    const permissionsResult = await db.collection('user_permissions')
      .where({ examId: examId })
      .get();

    const permissions = permissionsResult.data;
    deletedPermissions = permissions.length;

    for (const p of permissions) {
      await db.collection('user_permissions').doc(p._id).remove();
    }

    // 9. 最后删除科目
    await db.collection('exams').doc(examId).remove();

    return {
      success: true,
      data: {
        message: '科目删除成功',
        deleted: {
          questions: deletedQuestions,
          codes: deletedCodes,
          permissions: deletedPermissions
        }
      }
    };
  } catch (err) {
    console.error('删除科目失败：', err);
    return { success: false, error: '删除科目失败：' + err.message };
  }
};
