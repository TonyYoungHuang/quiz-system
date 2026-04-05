// pages/index/index.js
const api = require('../../utils/api');
const util = require('../../utils/util');
const practice = require('../../utils/practice');
const share = require('../../utils/share');

Page({
  data: {
    exams: [],
    filteredExams: [],
    examGroups: [],
    categories: [],
    selectedCategory: '',
    searchText: '',
    loading: false,
    entries: [
      {
        key: 'topic',
        title: '\u4e13\u9898\u8bad\u7ec3',
        subtitle: '\u6309\u4e13\u9898\u5237\u9898',
        icon: '\u4e13',
        url: '/pages/topic/topic'
      },
      {
        key: 'paper',
        title: '\u6a21\u62df\u8003\u8bd5',
        subtitle: '\u6309\u5e74\u4efd\u771f\u9898',
        icon: '\u6a21',
        url: '/pages/paper/paper'
      },
      {
        key: 'wrong',
        title: '\u9519\u9898\u672c',
        subtitle: '\u7cbe\u51c6\u590d\u4e60',
        icon: '\u9519',
        url: '/pages/wrong/wrong'
      },
      {
        key: 'favorite',
        title: '\u6536\u85cf\u5939',
        subtitle: '\u91cd\u70b9\u9898\u76ee',
        icon: '\u85cf',
        url: '/pages/favorite/favorite'
      }
    ],
    ui: {
      searchIcon: '\u641c',
      searchPlaceholder: '\u641c\u7d22\u79d1\u76ee\u540d\u79f0',
      allCategory: '\u5168\u90e8',
      myExamsGroup: '\u6211\u7684\u79d1\u76ee',
      myExamsHint: '\u5df2\u6fc0\u6d3b\u79d1\u76ee\u4f18\u5148\u5c55\u793a',
      moreExamsGroup: '\u5176\u4ed6\u79d1\u76ee',
      moreExamsHint: '\u672a\u6fc0\u6d3b\u79d1\u76ee\u5df2\u5f31\u5316\u663e\u793a',
      statusActivated: '\u5df2\u6fc0\u6d3b',
      statusPending: '\u5f85\u6fc0\u6d3b',
      lockedIcon: '\u9501',
      activatedIcon: '\u2713',
      questionUnit: '\u9053\u9898',
      remainingPrefix: '\u5269\u4f59',
      emptyIcon: '\u7a7a',
      emptyText: '\u6682\u65e0\u9898\u5e93'
    }
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
      const app = getApp();
      await app.getActivatedExams();
      const res = await api.getExams();
      const exams = res.data || [];
      const categories = [...new Set(exams.map(e => e.category))];

      const userId = app.globalData.userId;
      const activatedIds = (app.globalData.activatedExams || []).map(p => p.examId && p.examId._id).filter(Boolean);
      const hydratedExams = this.hydrateExamState(exams, userId, activatedIds);

      this.setData({
        exams: hydratedExams,
        categories,
        loading: false
      });
      this.filterExams();
    } catch (e) {
      util.showError('\u83b7\u53d6\u9898\u5e93\u5931\u8d25');
      this.setData({ loading: false });
    }
  },

  async refreshExamStatus() {
    const app = getApp();
    const userId = await app.ensureUserIdentity();
    const activatedIds = (app.globalData.activatedExams || []).map(p => p.examId && p.examId._id).filter(Boolean);

    const exams = this.hydrateExamState(this.data.exams, userId, activatedIds);

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

    const filteredExams = this.sortExams(exams);
    const examGroups = this.buildExamGroups(filteredExams);
    this.setData({ filteredExams, examGroups });
  },

  hydrateExamState(exams, userId, activatedIds) {
    return exams.map(exam => {
      const questionCount = exam.questionCount || 0;
      const answeredCount = userId ? practice.getAnsweredQuestionIds(userId, exam._id).length : 0;
      return {
        ...exam,
        isActivated: activatedIds.includes(exam._id),
        answeredCount,
        remainingQuestionCount: Math.max(questionCount - answeredCount, 0)
      };
    });
  },

  sortExams(exams) {
    return [...exams].sort((a, b) => {
      if (a.isActivated !== b.isActivated) {
        return a.isActivated ? -1 : 1;
      }

      const sortA = Number.isFinite(Number(a.sortOrder)) ? Number(a.sortOrder) : 999999;
      const sortB = Number.isFinite(Number(b.sortOrder)) ? Number(b.sortOrder) : 999999;
      if (sortA !== sortB) {
        return sortA - sortB;
      }

      return String(a.name || '').localeCompare(String(b.name || ''), 'zh-Hans-CN');
    });
  },

  buildExamGroups(exams) {
    const activated = exams.filter(exam => exam.isActivated);
    const pending = exams.filter(exam => !exam.isActivated);
    const groups = [];
    const ui = this.data.ui;

    if (activated.length) {
      groups.push({
        key: 'activated',
        title: ui.myExamsGroup,
        hint: ui.myExamsHint,
        exams: activated
      });
    }

    if (pending.length) {
      groups.push({
        key: 'pending',
        title: activated.length ? ui.moreExamsGroup : ui.allCategory,
        hint: activated.length ? ui.moreExamsHint : '',
        exams: pending
      });
    }

    return groups;
  },

  onExamTap(e) {
    const exam = e.currentTarget.dataset.exam;
    if (exam.isActivated) {
      wx.navigateTo({
        url: `/pages/exam/exam?examId=${exam._id}&title=${encodeURIComponent(exam.name)}`
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

  onEntryTap(e) {
    const url = e.currentTarget.dataset.url;
    if (!url) return;
    const app = getApp();
    app.ensureAnyActivatedExam().then(hasActivatedExam => {
      if (hasActivatedExam) {
        wx.navigateTo({ url });
        return;
      }

      wx.showModal({
        title: '提示',
        content: '请先激活至少一个科目后，再使用专题训练、模拟考试、错题本和收藏夹。',
        confirmText: '去激活',
        success: (res) => {
          if (res.confirm) {
            wx.switchTab({ url: '/pages/activate/activate' });
          }
        }
      });
    }).catch(() => {
      util.showError('获取激活状态失败');
    });
  },

  onPullDownRefresh() {
    this.loadExams().then(() => wx.stopPullDownRefresh());
  },

  onShareAppMessage() {
    return share.buildSharePayload({
      title: '题库刷题小程序，支持激活码开通、专题训练和模拟考试'
    });
  },

  onShareTimeline() {
    return {
      title: '题库刷题小程序，支持激活码开通、专题训练和模拟考试'
    };
  }
});
