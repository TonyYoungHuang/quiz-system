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
    const { examId, examName } = options;
    this.setData({
      examId: examId || '',
      examName: decodeURIComponent(examName || '')
    });

    this.loadActivatedExams();
  },

  onShow() {
    // 每次显示时检查是否有待激活的科目
    const app = getApp();
    console.log('[activate] onShow, pendingActivateExam:', app.globalData.pendingActivateExam);

    if (app.globalData.pendingActivateExam) {
      const { examId, examName } = app.globalData.pendingActivateExam;
      console.log('[activate] 从全局获取待激活科目:', examId, examName);

      this.setData({
        examId: examId || '',
        examName: examName || ''
      });

      // 清除全局数据，避免重复
      app.globalData.pendingActivateExam = null;
    }

    // 每次显示时刷新已激活列表
    this.loadActivatedExams();
  },

  /**
   * 加载已激活的科目
   */
  async loadActivatedExams() {
    try {
      const app = getApp();
      const userId = app.globalData.userId;

      if (!userId) return;

      const res = await api.getUserPermissions(userId);
      this.setData({ activatedExams: res.data || [] });

      // 更新全局数据
      app.globalData.activatedExams = res.data || [];
    } catch (error) {
      console.error('加载已激活科目失败:', error);
    }
  },

  /**
   * 输入激活码
   */
  onCodeInput(e) {
    let code = e.detail.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    console.log('[activate] 输入激活码:', e.detail.value, '处理后:', code);
    this.setData({ activationCode: code });
    console.log('[activate] setData后 activationCode:', this.data.activationCode);
  },

  /**
   * 清空激活码
   */
  onClearCode() {
    console.log('[activate] 清空激活码');
    this.setData({ activationCode: '' });
  },

  /**
   * 激活
   */
  async onActivate() {
    console.log('[activate] onActivate 开始');
    console.log('[activate] 当前 data.activationCode:', this.data.activationCode);
    const { activationCode, examId } = this.data;

    if (!activationCode) {
      console.error('[activate] activationCode 为空！');
      util.showError('请输入激活码');
      return;
    }

    if (activationCode.length < 8 || activationCode.length > 12) {
      util.showError('激活码格式不正确');
      return;
    }

    console.log('[activate] 开始激活，设置 activating=true');
    this.setData({ activating: true });

    try {
      console.log('[activate] 调用 api.activateCode');
      const res = await api.activateCode(activationCode, examId);
      console.log('[activate] 激活响应:', res);

      util.showSuccess('激活成功！');

      // 刷新已激活列表
      console.log('[activate] 刷新已激活列表');
      await this.loadActivatedExams();

      // 清空输入
      this.setData({
        activationCode: '',
        activating: false
      });

      // 如果有指定科目，延迟后跳转到答题页
      if (examId) {
        setTimeout(() => {
          wx.navigateTo({
            url: `/pages/exam/exam?examId=${examId}&examName=${this.data.examName}`
          });
        }, 1500);
      }

    } catch (error) {
      console.error('[activate] 激活失败:', error);
      this.setData({ activating: false });
    }
  },

  /**
   * 点击已激活的科目
   */
  onExamTap(e) {
    const exam = e.currentTarget.dataset.exam;
    wx.navigateTo({
      url: `/pages/exam/exam?examId=${exam._id}&examName=${exam.name}`
    });
  }
});
