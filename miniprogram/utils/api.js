// utils/api.js - 云函数 API 服务封装

/**
 * 通用云函数调用
 */
function callCloudFunction(name, data = {}) {
  return new Promise((resolve, reject) => {
    console.log('[api] 调用云函数:', name, data);

    wx.cloud.callFunction({
      name: name,
      data: data
    }).then(res => {
      console.log('[api] 云函数响应成功:', res);
      if (res.result.success) {
        resolve(res.result);
      } else {
        wx.showToast({
          title: res.result.message || '请求失败',
          icon: 'none'
        });
        reject(res.result);
      }
    }).catch(error => {
      console.error('[api] 云函数响应失败:', error);
      wx.showToast({
        title: '网络请求失败',
        icon: 'none'
      });
      reject(error);
    });
  });
}

// ==================== 科目相关 API ====================

/**
 * 获取科目列表
 */
function getExams(category) {
  return callCloudFunction('getExams', { category });
}

/**
 * 获取科目详情
 */
function getExamById(examId) {
  // 云开发中可以直接查询数据库，暂不需要单独的云函数
  return getExams().then(res => {
    const exam = res.data.find(e => e._id === examId);
    return {
      success: !!exam,
      data: exam
    };
  });
}

// ==================== 题目相关 API ====================

/**
 * 获取题目列表
 */
function getQuestions(examId, type) {
  return callCloudFunction('getQuestions', { examId, type });
}

/**
 * 获取题目详情（含答案）
 */
function getQuestionDetail(examId, questionId) {
  return getQuestions(examId).then(res => {
    const question = res.data.find(q => q._id === questionId);
    return {
      success: !!question,
      data: question
    };
  });
}

// ==================== 激活码相关 API ====================

/**
 * 激活码核销
 */
function activateCode(code, examId) {
  const app = getApp();
  return callCloudFunction('activateCode', {
    code: code.toUpperCase(),
    userId: app.globalData.userId,
    examId: examId
  });
}

/**
 * 获取用户的所有权限
 */
function getUserPermissions(userId) {
  return callCloudFunction('getPermissions', { userId });
}

/**
 * 检查用户是否有权限访问某科目
 */
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
