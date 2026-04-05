// app.js
const runtime = require('./utils/runtime');

App({
  globalData: {
    userInfo: null,
    userId: null,
    openId: '',
    legacyUserId: '',
    identityReady: false,
    activatedExams: [],
    pendingActivateExam: null,
    cloudEnvId: runtime.DEFAULT_RUNTIME.cloudEnvId,
    useHttpApi: false,
    baseUrl: ''
  },

  onLaunch() {
    console.log('[app] onLaunch');

    const runtimeConfig = runtime.getRuntimeConfig();
    this.globalData.cloudEnvId = runtimeConfig.cloudEnvId;
    this.globalData.useHttpApi = runtimeConfig.enableHttpApi;
    this.globalData.baseUrl = runtimeConfig.httpApiBaseUrl;

    if (!wx.cloud) {
      console.error('[app] wx.cloud not available');
    } else {
      wx.cloud.init({
        env: this.globalData.cloudEnvId,
        traceUser: true
      });
    }

    if (this.globalData.useHttpApi && this.globalData.baseUrl) {
      console.warn('[app] HTTP API mode enabled:', this.globalData.baseUrl);
    } else {
      console.log('[app] Cloud function mode enabled:', this.globalData.cloudEnvId);
    }

    this.identityReadyPromise = this.bootstrapUserIdentity();
  },

  async bootstrapUserIdentity() {
    const legacyUserId = wx.getStorageSync('userId') || '';
    const storedOpenId = wx.getStorageSync('openId') || '';

    try {
      const api = require('./utils/api');
      const res = await api.getCurrentUserIdentity(legacyUserId);
      const openId = (res.data && res.data.openId) || storedOpenId || '';
      const userId = openId || legacyUserId || this.generateTempUserId();

      this.applyUserIdentity({
        openId,
        userId,
        legacyUserId: legacyUserId && legacyUserId !== userId ? legacyUserId : ''
      });
    } catch (error) {
      console.error('[app] bootstrapUserIdentity error', error);
      const userId = storedOpenId || legacyUserId || this.generateTempUserId();

      this.applyUserIdentity({
        openId: storedOpenId || '',
        userId,
        legacyUserId: legacyUserId && legacyUserId !== userId ? legacyUserId : ''
      });
    } finally {
      this.globalData.identityReady = true;
    }

    if (this.globalData.userId) {
      await this.fetchActivatedExams(this.globalData.userId);
    }

    return this.globalData.userId;
  },

  applyUserIdentity({ openId = '', userId, legacyUserId = '' }) {
    this.globalData.openId = openId;
    this.globalData.userId = userId;
    this.globalData.legacyUserId = legacyUserId;

    wx.setStorageSync('userId', userId);
    if (openId) {
      wx.setStorageSync('openId', openId);
    }
  },

  async ensureUserIdentity() {
    if (this.identityReadyPromise) {
      await this.identityReadyPromise;
    }
    return this.globalData.userId;
  },

  generateTempUserId() {
    return 'temp_user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  },

  async fetchActivatedExams(userId) {
    try {
      const api = require('./utils/api');
      const res = await api.getUserPermissions(userId);
      this.globalData.activatedExams = res.data || [];
      return this.globalData.activatedExams;
    } catch (err) {
      console.error('[app] fetchActivatedExams error', err);
      return [];
    }
  },

  async getActivatedExams() {
    const userId = await this.ensureUserIdentity();
    if (!userId) return [];
    return this.fetchActivatedExams(userId);
  },

  getActivatedExamIds() {
    return (this.globalData.activatedExams || [])
      .map(item => item.examId && item.examId._id)
      .filter(Boolean);
  },

  async ensureAnyActivatedExam() {
    await this.getActivatedExams();
    return this.getActivatedExamIds().length > 0;
  },

  async ensureExamPermission(examId) {
    if (!examId) return false;
    await this.getActivatedExams();
    return this.hasExamPermission(examId);
  },

  hasExamPermission(examId) {
    const activatedIds = this.getActivatedExamIds();
    return activatedIds.includes(examId);
  }
});
