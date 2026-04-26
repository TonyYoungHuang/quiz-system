// pages/activate/activate.js
const api = require('../../utils/api');
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
    examId: '',
    examName: '',
    examIcon: '',
    activationCode: '',
    inputDigits: 0,
    activating: false,
    activatedExams: [],
    ui: {
      pageTitle: '\u6fc0\u6d3b\u79d1\u76ee',
      activateDesc: '\u8f93\u5165\u6fc0\u6d3b\u7801\u5373\u53ef\u5f00\u901a\u8be5\u79d1\u76ee',
      pendingTitle: '\u5f53\u524d\u5f85\u5f00\u901a',
      activateFormTitle: '\u8f93\u5165\u6fc0\u6d3b\u7801',
      codeRule: '\u652f\u6301 8-12 \u4f4d\u5b57\u6bcd\u6216\u6570\u5b57',
      codePlaceholder: '\u8bf7\u8f93\u5165 8-12 \u4f4d\u6fc0\u6d3b\u7801',
      inputDigitsLabel: '\u5df2\u8f93\u5165\u4f4d\u6570',
      activatedCountLabel: '\u5df2\u5f00\u901a\u79d1\u76ee',
      tipsLabel: '\u63d0\u793a',
      tipsText: '\u6fc0\u6d3b\u7801\u4e3a 8-12 \u4f4d\u5b57\u6bcd\u6216\u6570\u5b57',
      activating: '\u6fc0\u6d3b\u4e2d...',
      activateNow: '\u7acb\u5373\u6fc0\u6d3b',
      activatedList: '\u5df2\u6fc0\u6d3b\u79d1\u76ee',
      emptyTitle: '\u6682\u65e0',
      emptyText: '\u6682\u65e0\u5df2\u6fc0\u6d3b\u79d1\u76ee',
      codeIcon: '\u7801',
      activatedTag: '\u5df2\u5f00\u901a',
      goPractice: '\u53bb\u5237\u9898',
      countSuffix: '\u4e2a\u5df2\u5f00\u901a',
      questionUnit: '\u9053\u9898'
    }
  },

  onLoad(options) {
    this.setupCustomNavBar();
    const { examId, examName } = options || {};
    this.setData({
      examId: examId || '',
      examName: examName ? decodeURIComponent(examName) : '',
      examIcon: options && options.examIcon ? decodeURIComponent(options.examIcon) : ''
    });
    this.loadActivatedExams();
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

  onShow() {
    this.updateCustomTabBar();
    const app = getApp();
    if (app.globalData.pendingActivateExam) {
      const { examId, examName, examIcon } = app.globalData.pendingActivateExam;
      this.setData({ examId: examId || '', examName: examName || '', examIcon: examIcon || '' });
      app.globalData.pendingActivateExam = null;
    }
    this.loadActivatedExams();
  },

  updateCustomTabBar() {
    if (typeof this.getTabBar !== 'function') return;
    const tabBar = this.getTabBar();
    if (!tabBar) return;
    tabBar.setData({ selected: 1 });
  },

  async loadActivatedExams() {
    try {
      const app = getApp();
      await app.ensureUserIdentity();
      const userId = app.globalData.userId;
      if (!userId) return;

      const res = await api.getUserPermissions(userId);
      const activatedExams = (res.data || []).map(item => ({
        ...item,
        examId: item.examId ? {
          ...item.examId,
          displayIcon: resolveExamIcon(item.examId.icon)
        } : item.examId
      }));
      this.setData({ activatedExams });
      app.globalData.activatedExams = activatedExams;
    } catch (e) {
      console.error('loadActivatedExams error', e);
    }
  },

  onCodeInput(e) {
    const code = (e.detail.value || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    this.setData({
      activationCode: code,
      inputDigits: code.length
    });
  },

  onClearCode() {
    this.setData({
      activationCode: '',
      inputDigits: 0
    });
  },

  async onActivate() {
    const { activationCode, examId } = this.data;
    const app = getApp();
    await app.ensureUserIdentity();

    if (!activationCode) {
      util.showError('\u8bf7\u8f93\u5165\u6fc0\u6d3b\u7801');
      return;
    }
    if (activationCode.length < 8 || activationCode.length > 12) {
      util.showError('\u6fc0\u6d3b\u7801\u957f\u5ea6\u4e3a 8-12 \u4f4d');
      return;
    }

    this.setData({ activating: true });
    try {
      const res = await api.activateCode(activationCode, examId);
      const activatedExamId = (res.data && res.data.examId) || examId || '';
      const activatedExamName = (res.data && res.data.examName) || this.data.examName || '';
      const activatedExamIcon = this.data.examIcon || '';

      util.showSuccess('\u6fc0\u6d3b\u6210\u529f');
      await this.loadActivatedExams();
      this.setData({
        activationCode: '',
        inputDigits: 0,
        activating: false,
        examId: activatedExamId,
        examName: activatedExamName,
        examIcon: activatedExamIcon
      });

      if (activatedExamId) {
        setTimeout(() => {
          wx.navigateTo({
            url: `/pages/exam/exam?examId=${activatedExamId}&title=${encodeURIComponent(activatedExamName)}`
          });
        }, 800);
      }
    } catch (e) {
      this.setData({ activating: false });
    }
  },

  onExamTap(e) {
    const exam = e.currentTarget.dataset.exam;
    wx.navigateTo({
      url: `/pages/exam/exam?examId=${exam._id}&title=${encodeURIComponent(exam.name)}`
    });
  },

  onShareAppMessage() {
    const title = this.data.examName
      ? `\u8f93\u5165\u6fc0\u6d3b\u7801\u5373\u53ef\u5f00\u901a\u300a${this.data.examName}\u300b\u9898\u5e93`
      : '\u8f93\u5165\u6fc0\u6d3b\u7801\u5373\u53ef\u5f00\u901a\u5bf9\u5e94\u9898\u5e93\uff0c\u652f\u6301\u968f\u65f6\u5237\u9898';
    return share.buildSharePayload({ title });
  },

  onShareTimeline() {
    return {
      title: this.data.examName
        ? `\u8f93\u5165\u6fc0\u6d3b\u7801\u5373\u53ef\u5f00\u901a\u300a${this.data.examName}\u300b\u9898\u5e93`
        : '\u8f93\u5165\u6fc0\u6d3b\u7801\u5373\u53ef\u5f00\u901a\u5bf9\u5e94\u9898\u5e93\uff0c\u652f\u6301\u968f\u65f6\u5237\u9898'
    };
  }
});
