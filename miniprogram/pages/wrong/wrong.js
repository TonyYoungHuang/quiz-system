const practice = require('../../utils/practice');
const util = require('../../utils/util');
const share = require('../../utils/share');

function resolveExamIcon(icon, fallback = '📚') {
  const value = String(icon || '').trim();
  return value || fallback;
}

Page({
  data: {
    navBar: {
      statusBarHeight: 20,
      navHeight: 44
    },
    wrongExams: [],
    totalWrongCount: 0,
    loading: false,
    ui: {
      title: '错题本',
      desc: '自动汇总答错题目，方便集中复习与查漏补缺',
      backIcon: '<',
      badgeSuffix: '个科目',
      heroTotalLabel: '累计错题',
      heroExamLabel: '待复习科目',
      listTitle: '待复习列表',
      listHint: '优先回顾近期错题',
      reminderTag: '错题提醒',
      defaultCategory: '默认分类',
      countSuffix: '道待复习',
      action: '开始复习',
      emptyTitle: '当前还没有错题',
      emptyDesc: '继续刷题后，错题会自动汇总到这里'
    }
  },

  onLoad() {
    this.setupCustomNavBar();
  },

  onShow() {
    this.loadWrongExams();
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

  onBack() {
    const pages = getCurrentPages();
    if (pages.length > 1) {
      wx.navigateBack({ delta: 1 });
      return;
    }
    wx.switchTab({ url: '/pages/index/index' });
  },

  promptActivate() {
    wx.showModal({
      title: '提示',
      content: '请先激活至少一个科目后，再使用错题本。',
      confirmText: '去激活',
      success: (res) => {
        if (res.confirm) {
          wx.switchTab({ url: '/pages/activate/activate' });
          return;
        }
        this.onBack();
      }
    });
  },

  async loadWrongExams() {
    this.setData({ loading: true });
    try {
      const app = getApp();
      const userId = await app.ensureUserIdentity();
      const permissions = await app.getActivatedExams();
      if (!permissions || !permissions.length) {
        this.setData({
          wrongExams: [],
          totalWrongCount: 0,
          loading: false
        });
        this.promptActivate();
        return;
      }

      const exams = (permissions || [])
        .map(item => item.examId)
        .filter(Boolean)
        .map(exam => ({
          _id: exam._id,
          name: exam.name,
          category: exam.category,
          displayIcon: resolveExamIcon(exam.icon)
        }));

      const wrongExams = practice.getWrongExamSummaries(userId, exams)
        .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
      const totalWrongCount = wrongExams.reduce((sum, item) => sum + Number(item.wrongCount || 0), 0);

      this.setData({
        wrongExams,
        totalWrongCount,
        loading: false
      });
    } catch (error) {
      console.error('[wrong] loadWrongExams failed', error);
      this.setData({ loading: false });
      util.showError('获取错题本失败');
    }
  },

  onReviewTap(e) {
    const examId = e.currentTarget.dataset.id;
    const examName = e.currentTarget.dataset.name;
    if (!examId) return;
    const app = getApp();
    app.ensureExamPermission(examId).then(hasPermission => {
      if (!hasPermission) {
        this.promptActivate();
        return;
      }
      wx.navigateTo({
        url: `/pages/exam/exam?examId=${examId}&title=${encodeURIComponent(examName || '')}&mode=wrong`
      });
    }).catch(() => {
      util.showError('获取激活状态失败');
    });
  },

  onPullDownRefresh() {
    Promise.resolve(this.loadWrongExams()).finally(() => wx.stopPullDownRefresh());
  },

  onShareAppMessage() {
    return share.buildSharePayload({
      title: '错题本支持集中复习，适合查漏补缺'
    });
  },

  onShareTimeline() {
    return {
      title: '错题本支持集中复习，适合查漏补缺'
    };
  }
});
