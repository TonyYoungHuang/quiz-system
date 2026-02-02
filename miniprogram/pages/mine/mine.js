// pages/mine/mine.js
const util = require('../../utils/util');

Page({
  data: {
    userId: '',
    activatedCount: 0,
    totalQuestions: 0
  },

  onShow() {
    this.loadUserInfo();
    this.loadStats();
  },

  loadUserInfo() {
    const app = getApp();
    const userId = app.globalData.userId || '游客';
    this.setData({ userId });
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
    util.showConfirm('答题记录功能暂未开放');
  },

  onAbout() {
    wx.showModal({
      title: '关于我们',
      content: '刷题小程序 v1.0.0\n\n本产品用于题库练习与模拟考试。',
      showCancel: false
    });
  }
});
