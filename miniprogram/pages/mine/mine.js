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

  /**
   * 加载用户信息
   */
  loadUserInfo() {
    const app = getApp();
    const userId = app.globalData.userId || '未登录';
    this.setData({ userId });
  },

  /**
   * 加载统计数据
   */
  loadStats() {
    const app = getApp();
    const activatedExams = app.globalData.activatedExams || [];

    // 计算总题目数
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

  /**
   * 我的科目
   */
  onMyExams() {
    wx.switchTab({
      url: '/pages/index/index'
    });
  },

  /**
   * 答题记录
   */
  onHistory() {
    util.showConfirm('答题记录功能开发中，敬请期待！');
  },

  /**
   * 关于我们
   */
  onAbout() {
    wx.showModal({
      title: '关于我们',
      content: '刷题小程序 v1.0.0\n\n提供多类目在线刷题服务，支持动态科目管理和激活码解锁。',
      showCancel: false
    });
  }
});
