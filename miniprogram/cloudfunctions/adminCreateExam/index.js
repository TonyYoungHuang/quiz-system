// 云函数入口文件
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

// 云函数入口函数
exports.main = async (event, context) => {
  const { token, name, category, icon, sortOrder } = event;

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

    // 生成科目ID
    const _id = 'exam_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);

    // 创建科目
    await db.collection('exams').add({
      data: {
        _id: _id,
        name: name,
        category: category || '默认分类',
        icon: icon || '📚',
        sortOrder: sortOrder || 0,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });

    return {
      success: true,
      message: '科目创建成功',
      data: {
        _id: _id
      }
    };
  } catch (error) {
    console.error('创建科目失败:', error);
    return {
      success: false,
      message: '创建科目失败',
      error: error.message
    };
  }
};
