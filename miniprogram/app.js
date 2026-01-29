// app.js
App({
  globalData: {
    userInfo: null,
    userId: null,  // 用户ID
    activatedExams: []  // 已激活的科目列表
  },

  onLaunch() {
    console.log('[app] onLaunch 开始');

    // 初始化云开发
    if (!wx.cloud) {
      console.error('[app] 请使用 2.2.3 或以上的基础库以使用云能力');
    } else {
      wx.cloud.init({
        env: 'cloud1-0g8twq2fde2fa6f0',  // 云环境ID
        traceUser: true
      });
    }

    // 先获取或生成用户ID，然后再获取已激活的科目
    const userId = wx.getStorageSync('userId') || this.generateTempUserId();
    console.log('[app] userId:', userId);
    this.globalData.userId = userId;
    wx.setStorageSync('userId', userId);

    // 然后获取已激活的科目
    this.getActivatedExams();
  },

  // 生成临时用户ID（用于测试）
  generateTempUserId() {
    return 'temp_user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  },

  // 获取已激活的科目（使用云函数）
  getActivatedExams() {
    console.log('[app] getActivatedExams 开始');
    const that = this;
    const userId = this.globalData.userId;
    console.log('[app] userId:', userId);
    if (!userId) return;

    wx.cloud.callFunction({
      name: 'getPermissions',
      data: {
        userId: userId
      }
    }).then(res => {
      console.log('[app] getActivatedExams 响应:', res);
      if (res.result.success) {
        that.globalData.activatedExams = res.result.data || [];
        console.log('[app] 已激活科目列表:', that.globalData.activatedExams);
      }
    }).catch(error => {
      console.error('[app] 获取已激活科目失败:', error);
    });
  },

  // 检查是否有权限访问某科目
  hasExamPermission(examId) {
    // examId 是一个对象，需要提取 _id 字段
    const activatedIds = this.globalData.activatedExams.map(p => p.examId._id);
    return activatedIds.includes(examId);
  }
});
