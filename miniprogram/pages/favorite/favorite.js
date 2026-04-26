const api = require('../../utils/api');
const util = require('../../utils/util');
const practice = require('../../utils/practice');
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
    favorites: [],
    totalFavoriteCount: 0,
    loading: false,
    ui: {
      title: '收藏夹',
      desc: '把重点题目收进这里，方便考前反复回看',
      backIcon: '<',
      badgeSuffix: '个科目',
      heroTotalLabel: '累计收藏',
      heroExamLabel: '收藏科目',
      listTitle: '收藏列表',
      listHint: '优先回看重点收藏',
      reminderTag: '重点收藏',
      defaultCategory: '默认分类',
      countSuffix: '道已收藏',
      action: '开始复习',
      previewTitle: '最近收藏',
      emptyTitle: '暂时还没有收藏题目',
      emptyDesc: '做题时点击收藏，重点题目会自动汇总到这里'
    }
  },

  onLoad() {
    this.setupCustomNavBar();
    this.loadFavorites();
  },

  onShow() {
    this.loadFavorites();
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
      content: '请先激活至少一个科目后，再使用收藏夹。',
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

  async loadFavorites() {
    this.setData({ loading: true });
    try {
      const app = getApp();
      const userId = await app.ensureUserIdentity();
      await app.getActivatedExams();

      const res = await api.getExams();
      const exams = res.data || [];
      const activatedIds = app.getActivatedExamIds();
      const visibleExams = exams.filter(item => activatedIds.includes(item._id));

      if (!visibleExams.length) {
        this.setData({
          favorites: [],
          totalFavoriteCount: 0,
          loading: false
        });
        this.promptActivate();
        return;
      }

      const favorites = practice.getFavoriteExamSummaries(userId, visibleExams)
        .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
        .map(item => ({
          ...item,
          displayIcon: resolveExamIcon(item.icon),
          previewQuestions: (item.favoriteQuestions || []).slice(0, 2)
        }));
      const totalFavoriteCount = favorites.reduce((sum, item) => sum + Number(item.favoriteCount || 0), 0);

      this.setData({
        favorites,
        totalFavoriteCount,
        loading: false
      });
    } catch (error) {
      console.error('[favorite] loadFavorites failed', error);
      this.setData({ loading: false });
      util.showError('获取收藏夹失败');
    }
  },

  onStartFavorite(e) {
    const examId = e.currentTarget.dataset.examId;
    const examName = e.currentTarget.dataset.examName;
    if (!examId) return;
    const app = getApp();
    app.ensureExamPermission(examId).then(hasPermission => {
      if (!hasPermission) {
        this.promptActivate();
        return;
      }
      wx.navigateTo({
        url: `/pages/exam/exam?examId=${examId}&title=${encodeURIComponent(examName || '')}&mode=favorite`
      });
    }).catch(() => {
      util.showError('获取激活状态失败');
    });
  },

  onOpenFavoriteQuestion(e) {
    const examId = e.currentTarget.dataset.examId;
    const examName = e.currentTarget.dataset.examName;
    const questionId = e.currentTarget.dataset.questionId;
    if (!examId || !questionId) return;
    const app = getApp();
    app.ensureExamPermission(examId).then(hasPermission => {
      if (!hasPermission) {
        this.promptActivate();
        return;
      }
      wx.navigateTo({
        url: `/pages/exam/exam?examId=${examId}&title=${encodeURIComponent(examName || '')}&mode=favorite&questionId=${encodeURIComponent(questionId)}`
      });
    }).catch(() => {
      util.showError('获取激活状态失败');
    });
  },

  onPullDownRefresh() {
    Promise.resolve(this.loadFavorites()).finally(() => wx.stopPullDownRefresh());
  },

  onShareAppMessage() {
    return share.buildSharePayload({
      title: '我把重点题目都收进收藏夹了，方便考前集中回看'
    });
  },

  onShareTimeline() {
    return {
      title: '我把重点题目都收进收藏夹了，方便考前集中回看'
    };
  }
});
