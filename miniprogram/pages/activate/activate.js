// pages/activate/activate.js
const api = require('../../utils/api');
const util = require('../../utils/util');

Page({
  data: {
    examId: '',
    examName: '',
    activationCode: '',
    activating: false,
    activatedExams: []
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
    if (!activationCode) {
      util.showError('??????');
      return;
    }
    if (activationCode.length < 8 || activationCode.length > 12) {
      util.showError('?????? 8-12 ?');
      return;
    }

    this.setData({ activating: true });
    try {
      await api.activateCode(activationCode, examId);
      util.showSuccess('????');
      await this.loadActivatedExams();
      this.setData({ activationCode: '', activating: false });

      if (examId) {
        setTimeout(() => {
          wx.navigateTo({
            url: `/pages/exam/exam?examId=${examId}&examName=${this.data.examName}`
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
      url: `/pages/exam/exam?examId=${exam._id}&examName=${exam.name}`
    });
  }
});
