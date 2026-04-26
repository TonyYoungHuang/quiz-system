// pages/mine/mine.js
const util = require('../../utils/util');
const share = require('../../utils/share');

Page({
  data: {
    navBar: {
      statusBarHeight: 20,
      navHeight: 44
    },
    userId: '',
    activatedCount: 0,
    totalQuestions: 0,
    menuItems: [
      {
        key: 'myExams',
        icon: '\u9898',
        title: '\u6211\u7684\u9898\u5e93',
        subtitle: '\u67e5\u770b\u5df2\u5f00\u901a\u9898\u5e93\u5e76\u7ee7\u7eed\u7ec3\u4e60',
        actionText: '\u8fdb\u5165'
      },
      {
        key: 'history',
        icon: '\u8bb0',
        title: '\u7b54\u9898\u8bb0\u5f55',
        subtitle: '\u540e\u7eed\u53ef\u67e5\u770b\u7ec3\u4e60\u8f68\u8ff9\u4e0e\u7b54\u9898\u8bb0\u5f55',
        actionText: '\u67e5\u770b'
      },
      {
        key: 'about',
        icon: '\u5173',
        title: '\u5173\u4e8e\u6211\u4eec',
        subtitle: '\u4e86\u89e3\u7248\u672c\u4fe1\u606f\u4e0e\u4ea7\u54c1\u8bf4\u660e',
        actionText: '\u67e5\u770b'
      }
    ],
    ui: {
      pageTitle: '\u6211\u7684',
      userLabel: '\u5237',
      userName: '\u5237\u9898\u7528\u6237',
      userIdPrefix: 'ID: ',
      activatedLabel: '\u5df2\u6fc0\u6d3b\u79d1\u76ee',
      totalQuestionsLabel: '\u9898\u76ee\u603b\u6570',
      sectionTitle: '\u5e38\u7528\u529f\u80fd',
      sectionHint: '\u7edf\u4e00\u5165\u53e3\uff0c\u5ef6\u7eed\u4e3b\u9875\u5361\u7247\u98ce\u683c',
      version: '\u7248\u672c 1.0.0',
      historyTip: '\u7b54\u9898\u8bb0\u5f55\u529f\u80fd\u6682\u672a\u5f00\u653e',
      aboutTitle: '\u5173\u4e8e\u6211\u4eec',
      aboutContent: '\u5237\u9898\u5c0f\u7a0b\u5e8f v1.0.0\\n\\n\u672c\u4ea7\u54c1\u7528\u4e8e\u9898\u5e93\u7ec3\u4e60\u4e0e\u6a21\u62df\u8003\u8bd5\u3002',
      summaryPrefix: '\u5df2\u5f00\u901a',
      summaryMiddle: '\u4e2a\u79d1\u76ee\uff0c\u53ef\u5237',
      summarySuffix: '\u9053\u9898'
    }
  },

  onLoad() {
    this.setupCustomNavBar();
  },

  setupCustomNavBar() {
    const systemInfo = wx.getSystemInfoSync ? wx.getSystemInfoSync() : {};
    const statusBarHeight = systemInfo.statusBarHeight || 20;
    let navHeight = 44;

    if (wx.getMenuButtonBoundingClientRect) {
      const menuButton = wx.getMenuButtonBoundingClientRect();
      if (menuButton && menuButton.top) {
        const verticalPadding = Math.max(menuButton.top - statusBarHeight, 6);
        navHeight = menuButton.height + verticalPadding * 2;
      }
    }

    this.setData({
      navBar: {
        statusBarHeight,
        navHeight
      }
    });
  },

  async onShow() {
    this.updateCustomTabBar();
    const app = getApp();
    await app.ensureUserIdentity();
    await app.getActivatedExams();
    this.loadUserInfo();
    this.loadStats();
  },

  updateCustomTabBar() {
    if (typeof this.getTabBar !== 'function') return;
    const tabBar = this.getTabBar();
    if (!tabBar) return;
    tabBar.setData({ selected: 2 });
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
    activatedExams.forEach((item) => {
      if (item.examId && item.examId.questionCount) {
        totalQuestions += item.examId.questionCount;
      }
    });

    this.setData({
      activatedCount: activatedExams.length,
      totalQuestions
    });
  },

  onMenuTap(e) {
    const action = e.currentTarget.dataset.action;
    if (action === 'myExams') {
      this.onMyExams();
      return;
    }
    if (action === 'history') {
      this.onHistory();
      return;
    }
    if (action === 'about') {
      this.onAbout();
    }
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
      title: '\u9898\u5e93\u5237\u9898\u5c0f\u7a0b\u5e8f\uff0c\u652f\u6301\u6fc0\u6d3b\u5f00\u901a\u548c\u9519\u9898\u590d\u4e60'
    });
  },

  onShareTimeline() {
    return {
      title: '\u9898\u5e93\u5237\u9898\u5c0f\u7a0b\u5e8f\uff0c\u652f\u6301\u6fc0\u6d3b\u5f00\u901a\u548c\u9519\u9898\u590d\u4e60'
    };
  }
});
