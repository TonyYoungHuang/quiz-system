// utils/api.js
const runtime = require('./runtime');

function getBaseUrl() {
  const app = getApp();
  if (app && app.globalData && app.globalData.baseUrl) {
    return app.globalData.baseUrl;
  }

  return runtime.getRuntimeConfig().httpApiBaseUrl || '';
}

function shouldUseHttpApi() {
  const app = getApp();
  if (app && app.globalData) {
    return !!app.globalData.useHttpApi && !!getBaseUrl();
  }

  const config = runtime.getRuntimeConfig();
  return !!config.enableHttpApi && !!config.httpApiBaseUrl;
}

function buildQuery(params = {}) {
  const parts = Object.keys(params)
    .filter(key => params[key] !== undefined && params[key] !== null && params[key] !== '')
    .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`);
  return parts.length ? `?${parts.join('&')}` : '';
}

function request(path, options = {}) {
  const baseUrl = getBaseUrl();
  if (!baseUrl) {
    return Promise.reject(new Error('baseUrl not set'));
  }

  const method = options.method || 'GET';
  const params = options.params || (method === 'GET' ? options.data : null) || {};
  const url = `${baseUrl}${path}${buildQuery(params)}`;

  return new Promise((resolve, reject) => {
    wx.request({
      url,
      method,
      data: method === 'GET' ? undefined : (options.data || {}),
      header: {
        'content-type': 'application/json'
      },
      success: (res) => {
        if (res.data && res.data.success) {
          resolve(res.data);
        } else {
          wx.showToast({
            title: (res.data && res.data.message) || '请求失败',
            icon: 'none'
          });
          reject(res.data || res);
        }
      },
      fail: (error) => {
        console.error('[api] request error', error);
        wx.showToast({ title: '网络异常', icon: 'none' });
        reject(error);
      }
    });
  });
}

function callCloudFunction(name, data = {}) {
  return new Promise((resolve, reject) => {
    wx.cloud.callFunction({ name, data }).then(res => {
      if (res.result && res.result.success) {
        resolve(res.result);
      } else {
        wx.showToast({
          title: (res.result && res.result.message) || '请求失败',
          icon: 'none'
        });
        reject(res.result || res);
      }
    }).catch(error => {
      console.error('[api] cloud error', error);
      wx.showToast({ title: '网络异常', icon: 'none' });
      reject(error);
    });
  });
}

function withFallback(httpFn, cloudFn) {
  if (shouldUseHttpApi()) return httpFn();
  return cloudFn();
}

function getCurrentUserIdentity(legacyUserId) {
  return callCloudFunction('getOpenId', { legacyUserId });
}

function getExams(category) {
  return withFallback(
    () => request('/exams', { params: { category } }),
    () => callCloudFunction('getExams', { category })
  );
}

function getExamById(examId) {
  return withFallback(
    () => request(`/exams/${examId}`),
    () => getExams().then(res => {
      const exam = (res.data || []).find(e => e._id === examId);
      return { success: !!exam, data: exam };
    })
  );
}

function getQuestions(examId, options = {}) {
  const { type, userId, topicId, paperId } = options;
  return withFallback(
    () => request(`/questions/${examId}`, { params: { type, userId, topicId, paperId } }),
    () => callCloudFunction('getQuestions', { examId, type, topicId, paperId, userId })
  );
}

function getQuestionDetail(examId, questionId, options = {}) {
  const { userId } = options;
  return withFallback(
    () => request(`/questions/${examId}/${questionId}`, { params: { userId } }),
    () => getQuestions(examId, { userId }).then(res => {
      const question = (res.data || []).find(q => q._id === questionId);
      return { success: !!question, data: question };
    })
  );
}

function activateCode(code, examId) {
  const app = getApp();
  const userId = app.globalData.userId;
  return withFallback(
    () => request('/activate', { method: 'POST', data: { code: code.toUpperCase(), userId, examId } }),
    () => callCloudFunction('activateCode', { code: code.toUpperCase(), userId, examId })
  );
}

function getUserPermissions(userId) {
  return withFallback(
    () => request(`/permissions/${userId}`),
    () => callCloudFunction('getPermissions', { userId })
  );
}

function checkPermission(userId, examId) {
  return withFallback(
    () => request('/permissions/check', { params: { userId, examId } }),
    () => callCloudFunction('checkPermission', { userId, examId })
  );
}

function getTopics(examId, parentId) {
  return withFallback(
    () => request('/topics', { params: { examId, parentId } }),
    () => callCloudFunction('getTopics', { examId, parentId })
  );
}

function getPapers(examId) {
  return withFallback(
    () => request('/papers', { params: { examId } }),
    () => callCloudFunction('getPapers', { examId })
  );
}

module.exports = {
  getCurrentUserIdentity,
  getExams,
  getExamById,
  getQuestions,
  getQuestionDetail,
  activateCode,
  getUserPermissions,
  checkPermission,
  getTopics,
  getPapers
};
