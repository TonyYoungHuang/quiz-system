// app.js
App({
  globalData: {
    userInfo: null,
    userId: null,
    activatedExams: [],
    pendingActivateExam: null
  },

  onLaunch() {
    console.log('[app] onLaunch');

    if (!wx.cloud) {
      console.error('[app] wx.cloud not available');
    } else {
      wx.cloud.init({
        env: 'cloud1-0g8twq2fde2fa6f0',
        traceUser: true
      });
    }

    const userId = wx.getStorageSync('userId') || this.generateTempUserId();
    this.globalData.userId = userId;
    wx.setStorageSync('userId', userId);

    this.getActivatedExams();
  },

  generateTempUserId() {
    return 'temp_user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  },

  getActivatedExams() {
    const userId = this.globalData.userId;
    if (!userId || !wx.cloud) return;

    wx.cloud.callFunction({
      name: 'getPermissions',
      data: { userId }
    }).then(res => {
      if (res.result && res.result.success) {
        this.globalData.activatedExams = res.result.data || [];
      }
    }).catch(err => {
      console.error('[app] getActivatedExams error', err);
    });
  },

  hasExamPermission(examId) {
    const activatedIds = (this.globalData.activatedExams || []).map(p => p.examId && p.examId._id).filter(Boolean);
    return activatedIds.includes(examId);
  }
});
