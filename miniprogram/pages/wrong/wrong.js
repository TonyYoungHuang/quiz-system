const practice = require('../../utils/practice');
const util = require('../../utils/util');
const share = require('../../utils/share');

Page({
  data: {
    wrongExams: [],
    loading: false,
    ui: {
      title: '错题本',
      desc: '答错的题会自动进入这里，改对后会自动移出。',
      emptyTitle: '当前没有错题',
      emptyDesc: '继续刷题后，错题会自动进入这里。',
      countSuffix: '道待复习',
      action: '开始复习'
    }
  },

  onShow() {
    this.loadWrongExams();
  },

  async loadWrongExams() {
    this.setData({ loading: true });
    try {
      const app = getApp();
      const userId = await app.ensureUserIdentity();
      const permissions = await app.getActivatedExams();
      const exams = (permissions || [])
        .map(item => item.examId)
        .filter(Boolean)
        .map(exam => ({
          _id: exam._id,
          name: exam.name,
          category: exam.category
        }));

      const wrongExams = practice.getWrongExamSummaries(userId, exams)
        .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));

      this.setData({
        wrongExams,
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

    wx.navigateTo({
      url: `/pages/exam/exam?examId=${examId}&title=${encodeURIComponent(examName || '')}&mode=wrong`
    });
  },

  onShareAppMessage() {
    return share.buildSharePayload({
      title: '错题本支持反复复习，适合查漏补缺'
    });
  },

  onShareTimeline() {
    return {
      title: '错题本支持反复复习，适合查漏补缺'
    };
  }
});
