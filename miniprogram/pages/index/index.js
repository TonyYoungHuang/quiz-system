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
    console.log('[index] onLoad 开始');
    this.loadExams();
  }

  ,

  onShow() {
    console.log('[index] onShow 开始');
    // 每次显示页面时刷新数据（激活状态可能变化）
    this.refreshExamStatus();
  },

  /**
   * 加载科目列表
   */
  async loadExams() {
    console.log('[index] 开始加载科目列表');
    this.setData({ loading: true });

    try {
      console.log('[index] 调用 api.getExams()');
      const res = await api.getExams();
      console.log('[index] API 响应:', res);
      const exams = res.data || [];
      console.log('[index] 解析到的科目数量:', exams.length);

      // 提取所有分类
      const categories = [...new Set(exams.map(e => e.category))];
      console.log('[index] 分类列表:', categories);

      // 标记已激活的科目
      const app = getApp();
      console.log('[index] app.globalData.activatedExams:', app.globalData.activatedExams);
      // examId 是一个对象，需要提取 _id 字段
      const activatedIds = app.globalData.activatedExams.map(p => p.examId._id);
      console.log('[index] 已激活的科目ID:', activatedIds);

      exams.forEach(exam => {
        exam.isActivated = activatedIds.includes(exam._id);
      });
      console.log('[index] 标记激活状态后的科目:', exams);

      this.setData({
        exams,
        filteredExams: exams,
        categories,
        loading: false
      });
      console.log('[index] setData 完成');
    } catch (error) {
      util.showError('加载科目列表失败');
      this.setData({ loading: false });
    }
  },

  /**
   * 刷新科目激活状态
   */
  refreshExamStatus() {
    const app = getApp();
    // examId 是一个对象，需要提取 _id 字段
    const activatedIds = app.globalData.activatedExams.map(p => p.examId._id);
    console.log('[index] refreshExamStatus - 已激活的科目ID:', activatedIds);

    const exams = this.data.exams.map(exam => ({
      ...exam,
      isActivated: activatedIds.includes(exam._id)
    }));

    this.setData({ exams });
    this.filterExams();
  },

  /**
   * 分类筛选
   */
  onCategoryChange(e) {
    const category = e.currentTarget.dataset.category;
    this.setData({ selectedCategory: category });
    this.filterExams();
  },

  /**
   * 搜索输入
   */
  onSearchInput(e) {
    const searchText = e.detail.value;
    this.setData({ searchText });
    this.filterExams();
  },

  /**
   * 筛选科目
   */
  filterExams() {
    let { exams, selectedCategory, searchText } = this.data;

    // 按分类筛选
    if (selectedCategory) {
      exams = exams.filter(e => e.category === selectedCategory);
    }

    // 按搜索关键词筛选
    if (searchText) {
      exams = exams.filter(e => e.name.includes(searchText));
    }

    this.setData({ filteredExams: exams });
  },

  /**
   * 点击科目卡片
   */
  onExamTap(e) {
    console.log('[index] onExamTap 触发');
    const exam = e.currentTarget.dataset.exam;
    console.log('[index] 点击的科目:', exam);

    if (exam.isActivated) {
      // 已激活，进入答题页
      console.log('[index] 已激活，跳转到答题页');
      wx.navigateTo({
        url: `/pages/exam/exam?examId=${exam._id}&examName=${exam.name}`
      });
    } else {
      // 未激活，进入激活页（使用 switchTab 因为 activate 在 tabBar 中）
      console.log('[index] 未激活，跳转到激活页');
      // 将要激活的 examId 和 examName 存储到全局
      const app = getApp();
      app.globalData.pendingActivateExam = {
        examId: exam._id,
        examName: exam.name
      };
      wx.switchTab({
        url: '/pages/activate/activate'
      });
    }
  },

  /**
   * 下拉刷新
   */
  onPullDownRefresh() {
    this.loadExams().then(() => {
      wx.stopPullDownRefresh();
    });
  }
});
