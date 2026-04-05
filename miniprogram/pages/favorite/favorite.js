const api = require('../../utils/api');
const util = require('../../utils/util');
const practice = require('../../utils/practice');
const share = require('../../utils/share');

Page({
  data: {
    favorites: [],
    loading: false,
    ui: {
      title: '收藏夹',
      start: '开始复习',
      countSuffix: '题',
      questionTitle: '已收藏题目',
      remove: '取消收藏',
      emptyTitle: '暂无收藏题',
      emptyDesc: '做题时点击收藏，重点题目会出现在这里'
    }
  },

  onLoad() {
    this.loadFavorites();
  },

  onShow() {
    this.loadFavorites();
  },

  promptActivate() {
    wx.showModal({
      title: '提示',
      content: '请先激活科目后，再使用收藏夹。',
      confirmText: '去激活',
      success: (res) => {
        if (res.confirm) {
          wx.switchTab({ url: '/pages/activate/activate' });
          return;
        }
        wx.navigateBack({ delta: 1 });
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
          loading: false
        });
        this.promptActivate();
        return;
      }

      const favorites = practice.getFavoriteExamSummaries(userId, visibleExams)
        .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));

      this.setData({
        favorites,
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

  async onRemoveFavorite(e) {
    const examId = e.currentTarget.dataset.examId;
    const questionId = e.currentTarget.dataset.questionId;
    if (!examId || !questionId) return;

    e.stopPropagation && e.stopPropagation();

    try {
      const app = getApp();
      const userId = await app.ensureUserIdentity();
      const favorites = practice.getFavoriteQuestionMap(userId, examId);
      const question = favorites[questionId];
      if (!question) {
        util.showError('该收藏题已不存在');
        return;
      }

      practice.toggleFavoriteQuestion(userId, examId, { _id: questionId, ...question });
      util.showSuccess('已取消收藏');
      this.loadFavorites();
    } catch (error) {
      console.error('[favorite] remove favorite failed', error);
      util.showError('取消收藏失败');
    }
  },

  onPullDownRefresh() {
    this.loadFavorites().then(() => wx.stopPullDownRefresh());
  },

  onShareAppMessage() {
    return share.buildSharePayload({
      title: '我把重点题都放进收藏夹了，方便反复复习'
    });
  },

  onShareTimeline() {
    return {
      title: '我把重点题都放进收藏夹了，方便反复复习'
    };
  }
});
