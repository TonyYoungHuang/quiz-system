// pages/index/index.js
const api = require('../../utils/api');
const util = require('../../utils/util');

Page({
  data: {
    exams: [],
    filteredExams: [],
    categories: [],
    selectedCategory: '',
    searchText: '',
    loading: false
  },

  onLoad() {
    this.loadExams();
  },

  onShow() {
    this.refreshExamStatus();
  },

  async loadExams() {
    this.setData({ loading: true });
    try {
      const res = await api.getExams();
      const exams = res.data || [];
      const categories = [...new Set(exams.map(e => e.category))];

      const app = getApp();
      const activatedIds = (app.globalData.activatedExams || []).map(p => p.examId && p.examId._id).filter(Boolean);
      exams.forEach(exam => {
        exam.isActivated = activatedIds.includes(exam._id);
      });

      this.setData({
        exams,
        filteredExams: exams,
        categories,
        loading: false
      });
    } catch (e) {
      util.showError('??????');
      this.setData({ loading: false });
    }
  },

  refreshExamStatus() {
    const app = getApp();
    const activatedIds = (app.globalData.activatedExams || []).map(p => p.examId && p.examId._id).filter(Boolean);

    const exams = this.data.exams.map(exam => ({
      ...exam,
      isActivated: activatedIds.includes(exam._id)
    }));

    this.setData({ exams });
    this.filterExams();
  },

  onCategoryChange(e) {
    const category = e.currentTarget.dataset.category;
    this.setData({ selectedCategory: category });
    this.filterExams();
  },

  onSearchInput(e) {
    const searchText = e.detail.value;
    this.setData({ searchText });
    this.filterExams();
  },

  filterExams() {
    let { exams, selectedCategory, searchText } = this.data;

    if (selectedCategory) {
      exams = exams.filter(e => e.category === selectedCategory);
    }
    if (searchText) {
      exams = exams.filter(e => e.name.includes(searchText));
    }

    this.setData({ filteredExams: exams });
  },

  onExamTap(e) {
    const exam = e.currentTarget.dataset.exam;
    if (exam.isActivated) {
      wx.navigateTo({
        url: `/pages/exam/exam?examId=${exam._id}&examName=${exam.name}`
      });
      return;
    }

    const app = getApp();
    app.globalData.pendingActivateExam = {
      examId: exam._id,
      examName: exam.name
    };
    wx.switchTab({ url: '/pages/activate/activate' });
  },

  onPullDownRefresh() {
    this.loadExams().then(() => wx.stopPullDownRefresh());
  }
});
