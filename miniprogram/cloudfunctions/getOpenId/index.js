const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

function isLegacyTempUserId(userId) {
  return typeof userId === 'string' && /^temp_user_/.test(userId);
}

async function migratePermissions(legacyUserId, openId) {
  const permissionsResult = await db.collection('user_permissions')
    .where({ userId: legacyUserId })
    .get();

  let migrated = 0;

  for (const permission of permissionsResult.data) {
    const exists = await db.collection('user_permissions')
      .where({
        userId: openId,
        examId: permission.examId
      })
      .get();

    if (exists.data.length > 0) {
      await db.collection('user_permissions').doc(permission._id).remove();
      continue;
    }

    await db.collection('user_permissions').doc(permission._id).update({
      data: {
        userId: openId
      }
    });
    migrated++;
  }

  return migrated;
}

async function migrateActivationCodes(legacyUserId, openId) {
  const codesResult = await db.collection('activation_codes')
    .where({ userId: legacyUserId })
    .get();

  for (const code of codesResult.data) {
    await db.collection('activation_codes').doc(code._id).update({
      data: {
        userId: openId
      }
    });
  }

  return codesResult.data.length;
}

exports.main = async (event = {}) => {
  const wxContext = cloud.getWXContext();
  const openId = wxContext.OPENID;
  const legacyUserId = typeof event.legacyUserId === 'string' ? event.legacyUserId.trim() : '';

  if (!openId) {
    return {
      success: false,
      message: '未获取到 openId'
    };
  }

  try {
    let migratedPermissions = 0;
    let migratedCodes = 0;

    if (isLegacyTempUserId(legacyUserId) && legacyUserId !== openId) {
      migratedPermissions = await migratePermissions(legacyUserId, openId);
      migratedCodes = await migrateActivationCodes(legacyUserId, openId);
    }

    return {
      success: true,
      data: {
        openId,
        appId: wxContext.APPID || '',
        unionId: wxContext.UNIONID || '',
        migrated: {
          permissions: migratedPermissions,
          codes: migratedCodes
        }
      }
    };
  } catch (error) {
    console.error('[getOpenId] error', error);
    return {
      success: false,
      message: '获取用户身份失败',
      error: error.message
    };
  }
};
