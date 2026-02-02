// 浜戝嚱鏁板叆鍙ｆ枃浠?const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;

// 浜戝嚱鏁板叆鍙ｅ嚱鏁?exports.main = async (event, context) => {
  const { code, userId, examId } = event;

  if (!code || !userId || !examId) {
    return {
      success: false,
      message: '缂哄皯蹇呰鍙傛暟'
    };
  }

  try {
    // 1. 鏌ユ壘婵€娲荤爜
    const codeResult = await db.collection('activation_codes')
      .where({
        code: code.toUpperCase()
      })
      .get();

    if (codeResult.data.length === 0) {
      return {
        success: false,
        message: '婵€娲荤爜涓嶅瓨鍦?
      };
    }

    const activationCode = codeResult.data[0];

    // 2. 妫€鏌ユ縺娲荤爜鏄惁宸茶浣跨敤
    if (activationCode.isUsed) {
      return {
        success: false,
        message: '婵€娲荤爜宸茶浣跨敤'
      };
    }

    // 3. 妫€鏌ユ縺娲荤爜鏄惁瀵瑰簲姝ｇ‘鐨勮€冭瘯绉戠洰
    if (activationCode.examId !== examId) {
      return {
        success: false,
        message: '婵€娲荤爜涓庡綋鍓嶇鐩笉鍖归厤'
      };
    }

    // 4. 妫€鏌ョ敤鎴锋槸鍚﹀凡鏈夎绉戠洰鐨勬潈闄?    const existingPermission = await db.collection('user_permissions')
      .where({
        userId: userId,
        examId: examId
      })
      .get();

    if (existingPermission.data.length > 0) {
      const permission = existingPermission.data[0];
      // 妫€鏌ユ潈闄愭槸鍚﹀凡杩囨湡
      if (permission.isPermanent || (permission.expiresAt && new Date(permission.expiresAt) > new Date())) {
        return {
          success: false,
          message: '鎮ㄥ凡鎷ユ湁璇ョ鐩殑鏉冮檺'
        };
      }
    }

    // 5. 浣跨敤浜嬪姟锛氭縺娲荤爜鏍囪涓哄凡浣跨敤 + 鍒涘缓鐢ㄦ埛鏉冮檺
    const transaction = await db.startTransaction();

    try {
      // 鏍囪婵€娲荤爜涓哄凡浣跨敤
      await transaction.collection('activation_codes')
        .doc(activationCode._id)
        .update({
          data: {
            isUsed: true,
            userId: userId,
            usedAt: new Date()
          }
        });

      // 鍒涘缓鐢ㄦ埛鏉冮檺
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
        message: '婵€娲绘垚鍔?
      };
    } catch (transactionError) {
      await transaction.rollback();
      throw transactionError;
    }
  } catch (error) {
    console.error('婵€娲诲け璐?', error);
    return {
      success: false,
      message: '婵€娲诲け璐?,
      error: error.message
    };
  }
};
