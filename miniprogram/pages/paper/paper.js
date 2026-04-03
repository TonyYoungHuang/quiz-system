// pages/paper/paper.js
const api = require('../../utils/api');
const util = require('../../utils/util');
const share = require('../../utils/share');

Page({
  data: {
    exams: [],
    selectedExamId: '',
    selectedExamName: '',
    papers: [],
    loading: false,
    ui: {
      title: '\u6a21\u62df\u8003\u8bd5',
      start: '\u5f00\u59cb',
      countSuffix: '\u9898',
      emptyTitle: '\u6682\u65e0\u771f\u9898',
      emptyDesc: '\u8bf7\u5148\u5728\u540e\u53f0\u914d\u7f6e\u771f\u9898'
    }
  },

  onLoad(options) {
    const { examId } = options || {};
    this.loadExams(examId || '');
  },

  async loadExams(initialExamId) {
    this.setData({ loading: true });
    try {
      const app = getApp();
      await app.getActivatedExams();
      const res = await api.getExams();
      const allExams = res.data || [];
      const activatedIds = (app.globalData.activatedExams || [])
        .map(item => item.examId && item.examId._id)
        .filter(Boolean);
      const exams = activatedIds.length
        ? allExams.filter(item => activatedIds.includes(item._id))
        : allExams;
      let selectedExamId = initialExamId;
      if (!selectedExamId && exams.length > 0) {
        selectedExamId = exams[0]._id;
      }
      const selectedExam = exams.find(e => e._id === selectedExamId) || {};

      this.setData({
        exams,
        selectedExamId,
        selectedExamName: selectedExam.name || '',
        loading: false
      });

      if (selectedExamId) {
        this.loadPapers(selectedExamId);
      }
    } catch (e) {
      util.showError('\u83b7\u53d6\u79d1\u76ee\u5931\u8d25');
      this.setData({ loading: false });
    }
  },

  async loadPapers(examId) {
    this.setData({ loading: true });
    try {
      const res = await api.getPapers(examId);
      const papers = res.data || [];
      this.setData({ papers, loading: false });
    } catch (e) {
      util.showError('\u83b7\u53d6\u771f\u9898\u5931\u8d25');
      this.setData({ loading: false });
    }
  },

  onExamTap(e) {
    const examId = e.currentTarget.dataset.examId;
    const examName = e.currentTarget.dataset.examName;
    if (examId === this.data.selectedExamId) return;
    this.setData({ selectedExamId: examId, selectedExamName: examName });
    this.loadPapers(examId);
  },

  onStartPaper(e) {
    const paperId = e.currentTarget.dataset.paperId;
    const paperTitle = e.currentTarget.dataset.paperTitle;
    const questionCount = Number(e.currentTarget.dataset.questionCount || 0);
    const examId = this.data.selectedExamId;
    if (!paperId || !examId) return;
    if (questionCount <= 0) {
      util.showError('\u8be5\u8bd5\u5377\u6682\u65e0\u53ef\u5237\u9898\u76ee');
      return;
    }
    wx.navigateTo({
      url: `/pages/exam/exam?examId=${examId}&paperId=${paperId}&title=${encodeURIComponent(paperTitle)}`
    });
  },

  onPullDownRefresh() {
    this.loadPapers(this.data.selectedExamId).then(() => wx.stopPullDownRefresh());
  },

  onShareAppMessage() {
    const examName = this.data.selectedExamName || '题库';
    return share.buildSharePayload({
      title: `《${examName}》支持按试卷和真题练习`
    });
  },

  onShareTimeline() {
    const examName = this.data.selectedExamName || '题库';
    return {
      title: `《${examName}》支持按试卷和真题练习`
    };
  }
});
