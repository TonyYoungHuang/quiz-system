const api = require('../../utils/api');
const util = require('../../utils/util');
const share = require('../../utils/share');

function resolveExamIcon(icon, fallback = '📚') {
  const value = String(icon || '').trim();
  return value || fallback;
}

function sortByOrder(a, b) {
  const orderA = Number.isFinite(Number(a && a.sortOrder)) ? Number(a.sortOrder) : 999999;
  const orderB = Number.isFinite(Number(b && b.sortOrder)) ? Number(b.sortOrder) : 999999;
  if (orderA !== orderB) return orderA - orderB;
  return String((a && (a.title || a.name)) || '').localeCompare(String((b && (b.title || b.name)) || ''), 'zh-Hans-CN');
}

function getTimeValue(value) {
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
}

function sortPapersByLatest(a, b) {
  const createdDiff = getTimeValue(b && b.createdAt) - getTimeValue(a && a.createdAt);
  if (createdDiff !== 0) return createdDiff;

  const updatedDiff = getTimeValue(b && b.updatedAt) - getTimeValue(a && a.updatedAt);
  if (updatedDiff !== 0) return updatedDiff;

  const yearDiff = Number(b && b.year || 0) - Number(a && a.year || 0);
  if (yearDiff !== 0) return yearDiff;

  return String((b && b._id) || '').localeCompare(String((a && a._id) || ''));
}

Page({
  data: {
    navBar: {
      statusBarHeight: 20,
      navHeight: 44
    },
    exams: [],
    selectedExamId: '',
    selectedExamName: '',
    selectedExamIcon: '',
    papers: [],
    loading: false,
    ui: {
      title: '模拟考试',
      subtitle: '国际中文教师证书CTCSOL',
      backIcon: '<',
      start: '开始',
      countSuffix: '题',
      cardTag: '真题试卷',
      heroExamLabel: '已激活科目',
      heroPaperLabel: '试卷数量',
      listTitle: '试卷列表',
      listHint: '排版与专题训练保持一致',
      emptyTitle: '暂无试卷',
      emptyDesc: '请先在后台配置模拟试卷',
      defaultExamName: '已激活科目'
    }
  },

  onLoad(options) {
    this.setupCustomNavBar();
    const { examId } = options || {};
    this.loadExams(examId || '');
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

  onBack() {
    const pages = getCurrentPages();
    if (pages.length > 1) {
      wx.navigateBack({ delta: 1 });
      return;
    }
    wx.switchTab({ url: '/pages/index/index' });
  },

  promptActivate() {
    wx.showModal({
      title: '??',
      content: '请先激活至少一个科目后，再使用模拟考试。',
      confirmText: '去激活',
      success: (res) => {
        if (res.confirm) {
          wx.switchTab({ url: '/pages/activate/activate' });
          return;
        }
        this.onBack();
      }
    });
  },

  async loadExams(initialExamId) {
    this.setData({ loading: true });
    try {
      const app = getApp();
      await app.getActivatedExams();
      const res = await api.getExams();
      const allExams = res.data || [];
      const activatedIds = app.getActivatedExamIds();
      const exams = allExams
        .filter(item => activatedIds.includes(item._id))
        .map(item => ({
          ...item,
          displayIcon: resolveExamIcon(item.icon)
        }))
        .sort(sortByOrder);

      if (!exams.length) {
        this.setData({
          exams: [],
          selectedExamId: '',
          selectedExamName: '',
          papers: [],
          loading: false
        });
        this.promptActivate();
        return;
      }

      let selectedExamId = initialExamId;
      if (!selectedExamId || !exams.some(item => item._id === selectedExamId)) {
        selectedExamId = exams[0]._id;
      }
      const selectedExam = exams.find(item => item._id === selectedExamId) || {};

      this.setData({
        exams,
        selectedExamId,
        selectedExamName: selectedExam.name || '',
        selectedExamIcon: selectedExam.displayIcon || '',
        loading: false
      });

      if (selectedExamId) {
        await this.loadPapers(selectedExamId);
      }
    } catch (error) {
      console.error('[paper] loadExams failed', error);
      util.showError('获取科目失败');
      this.setData({ loading: false });
    }
  },

  async loadPapers(examId) {
    this.setData({ loading: true });
    try {
      const res = await api.getPapers(examId);
      const papers = (res.data || []).slice().sort(sortPapersByLatest);
      this.setData({ papers, loading: false });
    } catch (error) {
      console.error('[paper] loadPapers failed', error);
      util.showError('获取试卷失败');
      this.setData({ loading: false });
    }
  },

  onExamTap(e) {
    const examId = e.currentTarget.dataset.examId;
    const examName = e.currentTarget.dataset.examName;
    const examIcon = e.currentTarget.dataset.examIcon;
    if (!examId || examId === this.data.selectedExamId) return;
    this.setData({ selectedExamId: examId, selectedExamName: examName || '', selectedExamIcon: examIcon || '' });
    this.loadPapers(examId);
  },

  onStartPaper(e) {
    const paperId = e.currentTarget.dataset.paperId;
    const paperTitle = e.currentTarget.dataset.paperTitle;
    const questionCount = Number(e.currentTarget.dataset.questionCount || 0);
    const examId = this.data.selectedExamId;
    if (!paperId || !examId) return;
    if (questionCount <= 0) {
      util.showError('该试卷暂时没有可练习的题目');
      return;
    }

    const app = getApp();
    app.ensureExamPermission(examId).then(hasPermission => {
      if (!hasPermission) {
        this.promptActivate();
        return;
      }
      wx.navigateTo({
        url: `/pages/exam/exam?examId=${examId}&paperId=${paperId}&title=${encodeURIComponent(paperTitle)}`
      });
    }).catch(() => {
      util.showError('获取激活状态失败');
    });
  },

  onPullDownRefresh() {
    Promise.resolve(this.loadPapers(this.data.selectedExamId)).finally(() => wx.stopPullDownRefresh());
  },

  onShareAppMessage() {
    const examName = this.data.selectedExamName || this.data.ui.defaultExamName;
    return share.buildSharePayload({
      title: `《${examName}》支持整卷模拟练习，适合考前冲刺`
    });
  },

  onShareTimeline() {
    const examName = this.data.selectedExamName || this.data.ui.defaultExamName;
    return {
      title: `《${examName}》支持整卷模拟练习，适合考前冲刺`
    };
  }
});
