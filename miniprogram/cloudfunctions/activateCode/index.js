// 云函数入口文件
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;

// 云函数入口函数
exports.main = async (event, context) => {
  const { code, userId, examId } = event;

  if (!code || !userId || !examId) {
    return {
      success: false,
      message: '缺少必要参数'
    };
  }

  try {
    // 1. 查找激活码
    const codeResult = await db.collection('activation_codes')
      .where({
        code: code.toUpperCase()
      })
      .get();

    if (codeResult.data.length === 0) {
      return {
        success: false,
        message: '激活码不存在'
      };
    }

    const activationCode = codeResult.data[0];

    // 2. 检查激活码是否已被使用
    if (activationCode.isUsed) {
      return {
        success: false,
        message: '激活码已被使用'
      };
    }

    // 3. 检查激活码是否对应正确的考试科目
    if (activationCode.examId !== examId) {
      return {
        success: false,
        message: '激活码与当前科目不匹配'
      };
    }

    // 4. 检查用户是否已有该科目的权限
    const existingPermission = await db.collection('user_permissions')
      .where({
        userId: userId,
        examId: examId
      })
      .get();

    if (existingPermission.data.length > 0) {
      const permission = existingPermission.data[0];
      // 检查权限是否已过期
      if (permission.isPermanent || (permission.expiresAt && new Date(permission.expiresAt) > new Date())) {
        return {
          success: false,
          message: '您已拥有该科目的权限'
        };
      }
    }

    // 5. 使用事务：激活码标记为已使用 + 创建用户权限
    const transaction = await db.startTransaction();

    try {
      // 标记激活码为已使用
      await transaction.collection('activation_codes')
        .doc(activationCode._id)
        .update({
          data: {
            isUsed: true,
            userId: userId,
            usedAt: new Date()
          }
        });

      // 创建用户权限
      await transaction.collection('user_permissions')
        .add({
          data: {
            userId: userId,
            examId: examId,
            isPermanent: true,
            createdAt: new Date()
          }
        });

      await transaction.commit();

      return {
        success: true,
        message: '激活成功'
      };
    } catch (transactionError) {
      await transaction.rollback();
      throw transactionError;
    }
  } catch (error) {
    console.error('激活失败:', error);
    return {
      success: false,
      message: '激活失败',
      error: error.message
    };
  }
};
