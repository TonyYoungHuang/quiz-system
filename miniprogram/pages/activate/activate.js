// pages/activate/activate.js
const api = require('../../utils/api');
const util = require('../../utils/util');
const share = require('../../utils/share');

Page({
  data: {
    examId: '',
    examName: '',
    activationCode: '',
    activating: false,
    activatedExams: [],
    ui: {
      pendingTitle: '\u5f53\u524d\u5f85\u6fc0\u6d3b\u79d1\u76ee',
      noExam: '\u672a\u9009\u62e9\u79d1\u76ee',
      activateTitle: '\u6fc0\u6d3b\u79d1\u76ee',
      activateDesc: '\u8f93\u5165\u6fc0\u6d3b\u7801\u5373\u53ef\u5f00\u901a\u8be5\u79d1\u76ee',
      codePlaceholder: '\u8bf7\u8f93\u5165 8-12 \u4f4d\u6fc0\u6d3b\u7801',
      tipsLabel: '\u63d0\u793a',
      tipsText: '\u6fc0\u6d3b\u7801\u4e3a 8-12 \u4f4d\u5b57\u6bcd\u6216\u6570\u5b57',
      activating: '\u6fc0\u6d3b\u4e2d...',
      activateNow: '\u7acb\u5373\u6fc0\u6d3b',
      activatedList: '\u5df2\u6fc0\u6d3b\u79d1\u76ee',
      emptyTitle: '\u6682\u65e0',
      emptyText: '\u6682\u65e0\u5df2\u6fc0\u6d3b\u79d1\u76ee',
      defaultIcon: '\u4e66'
    }
  },

  onLoad(options) {
    const { examId, examName } = options || {};
    this.setData({
      examId: examId || '',
      examName: examName ? decodeURIComponent(examName) : ''
    });
    this.loadActivatedExams();
  },

  onShow() {
    const app = getApp();
    if (app.globalData.pendingActivateExam) {
      const { examId, examName } = app.globalData.pendingActivateExam;
      this.setData({ examId: examId || '', examName: examName || '' });
      app.globalData.pendingActivateExam = null;
    }
    this.loadActivatedExams();
  },

  async loadActivatedExams() {
    try {
      const app = getApp();
      await app.ensureUserIdentity();
      const userId = app.globalData.userId;
      if (!userId) return;

      const res = await api.getUserPermissions(userId);
      this.setData({ activatedExams: res.data || [] });
      app.globalData.activatedExams = res.data || [];
    } catch (e) {
      console.error('loadActivatedExams error', e);
    }
  },

  onCodeInput(e) {
    const code = (e.detail.value || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    this.setData({ activationCode: code });
  },

  onClearCode() {
    this.setData({ activationCode: '' });
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

      util.showSuccess('\u6fc0\u6d3b\u6210\u529f');
      await this.loadActivatedExams();
      this.setData({
        activationCode: '',
        activating: false,
        examId: activatedExamId,
        examName: activatedExamName
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
      ? `输入激活码即可开通《${this.data.examName}》题库`
      : '输入激活码即可开通对应题库，支持随时刷题';
    return share.buildSharePayload({ title });
  },

  onShareTimeline() {
    return {
      title: this.data.examName
        ? `输入激活码即可开通《${this.data.examName}》题库`
        : '输入激活码即可开通对应题库，支持随时刷题'
    };
  }
});
