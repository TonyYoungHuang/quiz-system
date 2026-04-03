const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

function getCurrentUserId(event = {}) {
  const wxContext = cloud.getWXContext();
  return wxContext.OPENID || event.userId || '';
}

async function getAllPermissions(userId) {
  const pageSize = 100;
  let skip = 0;
  let list = [];

  while (true) {
    const result = await db.collection('user_permissions')
      .where({ userId })
      .skip(skip)
      .limit(pageSize)
      .get();

    list = list.concat(result.data);
    if (result.data.length < pageSize) break;
    skip += result.data.length;
  }

  return list;
}

exports.main = async (event = {}) => {
  const userId = getCurrentUserId(event);

  if (!userId) {
    return {
      success: false,
      message: '未获取到用户身份'
    };
  }

  try {
    const permissions = await getAllPermissions(userId);
    const validPermissions = [];

    for (const permission of permissions) {
      const isValid = permission.isPermanent ||
        (permission.expiresAt && new Date(permission.expiresAt) > new Date());

      if (!isValid) continue;

      const examResult = await db.collection('exams')
        .doc(permission.examId)
        .get();

      if (examResult.data) {
        validPermissions.push({
          ...permission,
          examId: examResult.data
        });
      }
    }

    return {
      success: true,
      data: validPermissions
    };
  } catch (error) {
    console.error('[getPermissions] error', error);
    return {
      success: false,
      message: '获取权限列表失败',
      error: error.message
    };
  }
};
