// pages/mine/mine.js
const util = require('../../utils/util');
const share = require('../../utils/share');

Page({
  data: {
    userId: '',
    activatedCount: 0,
    totalQuestions: 0,
    ui: {
      userLabel: '\u7528\u6237',
      userName: '\u5237\u9898\u7528\u6237',
      userIdPrefix: 'ID: ',
      activatedLabel: '\u5df2\u6fc0\u6d3b\u79d1\u76ee',
      totalQuestionsLabel: '\u9898\u76ee\u603b\u6570',
      myExams: '\u6211\u7684\u9898\u5e93',
      history: '\u7b54\u9898\u8bb0\u5f55',
      about: '\u5173\u4e8e\u6211\u4eec',
      version: '\u7248\u672c 1.0.0',
      historyTip: '\u7b54\u9898\u8bb0\u5f55\u529f\u80fd\u6682\u672a\u5f00\u653e',
      aboutTitle: '\u5173\u4e8e\u6211\u4eec',
      aboutContent: '\u5237\u9898\u5c0f\u7a0b\u5e8f v1.0.0\n\n\u672c\u4ea7\u54c1\u7528\u4e8e\u9898\u5e93\u7ec3\u4e60\u4e0e\u6a21\u62df\u8003\u8bd5\u3002'
    }
  },

  async onShow() {
    const app = getApp();
    await app.ensureUserIdentity();
    await app.getActivatedExams();
    this.loadUserInfo();
    this.loadStats();
  },

  loadUserInfo() {
    const app = getApp();
    const userId = this.maskUserId(app.globalData.openId || app.globalData.userId || '\u6e38\u5ba2');
    this.setData({ userId });
  },

  maskUserId(userId) {
    if (!userId || userId === '\u6e38\u5ba2') return userId;
    if (userId.length <= 10) return userId;
    return `${userId.slice(0, 4)}****${userId.slice(-4)}`;
  },

  loadStats() {
    const app = getApp();
    const activatedExams = app.globalData.activatedExams || [];
    let totalQuestions = 0;
    activatedExams.forEach(item => {
      if (item.examId && item.examId.questionCount) {
        totalQuestions += item.examId.questionCount;
      }
    });

    this.setData({
      activatedCount: activatedExams.length,
      totalQuestions
    });
  },

  onMyExams() {
    wx.switchTab({ url: '/pages/index/index' });
  },

  onHistory() {
    util.showConfirm(this.data.ui.historyTip);
  },

  onAbout() {
    wx.showModal({
      title: this.data.ui.aboutTitle,
      content: this.data.ui.aboutContent,
      showCancel: false
    });
  },

  onShareAppMessage() {
    return share.buildSharePayload({
      title: '题库刷题小程序，支持激活码开通和错题复习'
    });
  },

  onShareTimeline() {
    return {
      title: '题库刷题小程序，支持激活码开通和错题复习'
    };
  }
});
