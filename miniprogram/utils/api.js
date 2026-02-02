// utils/api.js
function callCloudFunction(name, data = {}) {
  return new Promise((resolve, reject) => {
    console.log('[api] callCloudFunction', name, data);
    wx.cloud.callFunction({ name, data }).then(res => {
      if (res.result && res.result.success) {
        resolve(res.result);
      } else {
        wx.showToast({
          title: (res.result && res.result.message) || '????',
          icon: 'none'
        });
        reject(res.result || res);
      }
    }).catch(error => {
      console.error('[api] cloud error', error);
      wx.showToast({ title: '??????????', icon: 'none' });
      reject(error);
    });
  });
}

function getExams(category) {
  return callCloudFunction('getExams', { category });
}

function getExamById(examId) {
  return getExams().then(res => {
    const exam = (res.data || []).find(e => e._id === examId);
    return { success: !!exam, data: exam };
  });
}

function getQuestions(examId, type) {
  return callCloudFunction('getQuestions', { examId, type });
}

function getQuestionDetail(examId, questionId) {
  return getQuestions(examId).then(res => {
    const question = (res.data || []).find(q => q._id === questionId);
    return { success: !!question, data: question };
  });
}

function activateCode(code, examId) {
  const app = getApp();
  return callCloudFunction('activateCode', {
    code: code.toUpperCase(),
    userId: app.globalData.userId,
    examId
  });
}

function getUserPermissions(userId) {
  return callCloudFunction('getPermissions', { userId });
}

function checkPermission(userId, examId) {
  return callCloudFunction('checkPermission', { userId, examId });
}

module.exports = {
  getExams,
  getExamById,
  getQuestions,
  getQuestionDetail,
  activateCode,
  getUserPermissions,
  checkPermission
};
