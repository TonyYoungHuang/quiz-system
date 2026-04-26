// pages/index/index.js
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
      pageTitle: '\u9898\u5e93',
      searchIcon: '\u641c',
      searchPlaceholder: '\u641c\u7d22\u79d1\u76ee\u540d\u79f0',
      allCategory: '\u5168\u90e8',
      myExamsGroup: '\u6211\u7684\u79d1\u76ee',
      myExamsHint: '\u5df2\u6fc0\u6d3b\u79d1\u76ee\u4f18\u5148\u5c55\u793a',
      moreExamsGroup: '\u5176\u4ed6\u79d1\u76ee',
      moreExamsHint: '\u672a\u6fc0\u6d3b\u79d1\u76ee\u5df2\u5f31\u5316\u663e\u793a',
      statusActivated: '\u5df2\u6fc0\u6d3b',
      statusPending: '\u53bb\u6fc0\u6d3b',
      lockedIcon: '\u9501',
      activatedIcon: '\u2713',
      questionUnit: '\u9053\u9898',
      remainingPrefix: '\u5269\u4f59',
      emptyIcon: '\u7a7a',
      emptyText: '\u6682\u65e0\u9898\u5e93'
    }
  },

  onLoad() {
    this.setupCustomNavBar();
    this.loadExams();
  },

  onShow() {
    this.updateCustomTabBar();
    this.refreshExamStatus();
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

  updateCustomTabBar() {
    if (typeof this.getTabBar !== 'function') return;
    const tabBar = this.getTabBar();
    if (!tabBar) return;
    tabBar.setData({ selected: 0 });
  },

  async loadExams() {
    this.setData({ loading: true });
    try {
      const app = getApp();
      await app.getActivatedExams();
      const res = await api.getExams();
      const exams = res.data || [];
      const categories = [...new Set(exams.map((exam) => exam.category))];

      const userId = app.globalData.userId;
      const activatedIds = (app.globalData.activatedExams || [])
        .map((permission) => permission.examId && permission.examId._id)
        .filter(Boolean);
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
    const activatedIds = (app.globalData.activatedExams || [])
      .map((permission) => permission.examId && permission.examId._id)
      .filter(Boolean);

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
      exams = exams.filter((exam) => exam.category === selectedCategory);
    }
    if (searchText) {
      exams = exams.filter((exam) => exam.name.includes(searchText));
    }

    const filteredExams = this.sortExams(exams);
    const examGroups = this.buildExamGroups(filteredExams);
    this.setData({ filteredExams, examGroups });
  },

  hydrateExamState(exams, userId, activatedIds) {
    return exams.map((exam) => {
      const questionCount = exam.questionCount || 0;
      const answeredCount = userId ? practice.getAnsweredQuestionIds(userId, exam._id).length : 0;
      return {
        ...exam,
        displayIcon: resolveExamIcon(exam.icon),
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
    const activated = exams.filter((exam) => exam.isActivated);
    const pending = exams.filter((exam) => !exam.isActivated);
    const groups = [];
    const { ui } = this.data;

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
      examName: exam.name,
      examIcon: exam.displayIcon || resolveExamIcon(exam.icon)
    };
    wx.switchTab({ url: '/pages/activate/activate' });
  },

  onEntryTap(e) {
    const url = e.currentTarget.dataset.url;
    if (!url) return;

    const app = getApp();
    app.ensureAnyActivatedExam().then((hasActivatedExam) => {
      if (hasActivatedExam) {
        wx.navigateTo({ url });
        return;
      }

      wx.showModal({
        title: '\u63d0\u793a',
        content: '\u8bf7\u5148\u6fc0\u6d3b\u81f3\u5c11\u4e00\u4e2a\u79d1\u76ee\u540e\uff0c\u518d\u4f7f\u7528\u4e13\u9898\u8bad\u7ec3\u3001\u6a21\u62df\u8003\u8bd5\u3001\u9519\u9898\u672c\u548c\u6536\u85cf\u5939\u3002',
        confirmText: '\u53bb\u6fc0\u6d3b',
        success: (res) => {
          if (res.confirm) {
            wx.switchTab({ url: '/pages/activate/activate' });
          }
        }
      });
    }).catch(() => {
      util.showError('\u83b7\u53d6\u6fc0\u6d3b\u72b6\u6001\u5931\u8d25');
    });
  },

  onPullDownRefresh() {
    this.loadExams().then(() => wx.stopPullDownRefresh());
  },

  onShareAppMessage() {
    return share.buildSharePayload({
      title: '\u9898\u5e93\u5237\u9898\u5c0f\u7a0b\u5e8f\uff0c\u652f\u6301\u6fc0\u6d3b\u5f00\u901a\u3001\u4e13\u9898\u8bad\u7ec3\u548c\u6a21\u62df\u8003\u8bd5'
    });
  },

  onShareTimeline() {
    return {
      title: '\u9898\u5e93\u5237\u9898\u5c0f\u7a0b\u5e8f\uff0c\u652f\u6301\u6fc0\u6d3b\u5f00\u901a\u3001\u4e13\u9898\u8bad\u7ec3\u548c\u6a21\u62df\u8003\u8bd5'
    };
  }
});
