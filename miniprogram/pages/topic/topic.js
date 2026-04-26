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
  return String((a && a.name) || '').localeCompare(String((b && b.name) || ''), 'zh-Hans-CN');
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
    topicCards: [],
    loading: false,
    ui: {
      title: '专题训练',
      subtitle: '国际中文教师证书CTCSOL',
      backIcon: '<',
      start: '开始',
      countSuffix: '题',
      cardTag: '专题练习',
      heroExamLabel: '已激活科目',
      heroTopicLabel: '专题组数',
      listTitle: '专题列表',
      listHint: '按模块拆分，适合针对性练习',
      emptyTitle: '暂无专题',
      emptyDesc: '请先在后台配置专题内容',
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
      content: '请先激活至少一个科目后，再使用专题训练。',
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
          topicCards: [],
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
        await this.loadTopics(selectedExamId);
      }
    } catch (error) {
      console.error('[topic] loadExams failed', error);
      util.showError('获取科目失败');
      this.setData({ loading: false });
    }
  },

  buildTopicCards(topics) {
    const parentMap = new Map();
    const childMap = {};

    (topics || []).forEach(item => {
      if (item && item.parentId) {
        const key = String(item.parentId);
        if (!childMap[key]) childMap[key] = [];
        childMap[key].push(item);
      } else if (item) {
        parentMap.set(String(item._id), item);
      }
    });

    const cards = [];

    Array.from(parentMap.values()).sort(sortByOrder).forEach(parent => {
      const children = (childMap[String(parent._id)] || []).sort(sortByOrder);
      if (children.length) {
        children.forEach(child => {
          cards.push({
            _id: child._id,
            name: child.name,
            parentName: parent.name,
            questionCount: Number(child.questionCount || 0),
            tagText: this.data.ui.cardTag
          });
        });
        return;
      }

      cards.push({
        _id: parent._id,
        name: parent.name,
        parentName: '',
        questionCount: Number(parent.questionCount || 0),
        tagText: this.data.ui.cardTag
      });
    });

    (topics || [])
      .filter(item => item && item.parentId && !parentMap.has(String(item.parentId)))
      .sort(sortByOrder)
      .forEach(item => {
        cards.push({
          _id: item._id,
          name: item.name,
          parentName: '',
          questionCount: Number(item.questionCount || 0),
          tagText: this.data.ui.cardTag
        });
      });

    return cards;
  },

  async loadTopics(examId) {
    this.setData({ loading: true });
    try {
      const res = await api.getTopics(examId);
      const topicCards = this.buildTopicCards(res.data || []);
      this.setData({ topicCards, loading: false });
    } catch (error) {
      console.error('[topic] loadTopics failed', error);
      util.showError('获取专题失败');
      this.setData({ loading: false });
    }
  },

  onExamTap(e) {
    const examId = e.currentTarget.dataset.examId;
    const examName = e.currentTarget.dataset.examName;
    const examIcon = e.currentTarget.dataset.examIcon;
    if (!examId || examId === this.data.selectedExamId) return;
    this.setData({ selectedExamId: examId, selectedExamName: examName || '', selectedExamIcon: examIcon || '' });
    this.loadTopics(examId);
  },

  onStartTopic(e) {
    const topicId = e.currentTarget.dataset.topicId;
    const topicName = e.currentTarget.dataset.topicName;
    const questionCount = Number(e.currentTarget.dataset.questionCount || 0);
    const examId = this.data.selectedExamId;
    if (!topicId || !examId) return;
    if (questionCount <= 0) {
      util.showError('该专题暂时没有可练习的题目');
      return;
    }

    const app = getApp();
    app.ensureExamPermission(examId).then(hasPermission => {
      if (!hasPermission) {
        this.promptActivate();
        return;
      }
      wx.navigateTo({
        url: `/pages/exam/exam?examId=${examId}&topicId=${topicId}&title=${encodeURIComponent(topicName)}`
      });
    }).catch(() => {
      util.showError('获取激活状态失败');
    });
  },

  onPullDownRefresh() {
    Promise.resolve(this.loadTopics(this.data.selectedExamId)).finally(() => wx.stopPullDownRefresh());
  },

  onShareAppMessage() {
    const examName = this.data.selectedExamName || this.data.ui.defaultExamName;
    return share.buildSharePayload({
      title: `《${examName}》支持按专题刷题，适合集中强化练习`
    });
  },

  onShareTimeline() {
    const examName = this.data.selectedExamName || this.data.ui.defaultExamName;
    return {
      title: `《${examName}》支持按专题刷题，适合集中强化练习`
    };
  }
});
