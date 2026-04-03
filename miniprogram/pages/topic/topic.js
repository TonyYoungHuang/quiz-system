// pages/topic/topic.js
const api = require('../../utils/api');
const util = require('../../utils/util');
const share = require('../../utils/share');

Page({
  data: {
    exams: [],
    selectedExamId: '',
    selectedExamName: '',
    topicGroups: [],
    loading: false,
    ui: {
      title: '\u4e13\u9898\u8bad\u7ec3',
      start: '\u5f00\u59cb',
      countSuffix: '\u9898',
      emptyChild: '\u6682\u65e0\u5b50\u4e13\u9898',
      emptyTitle: '\u6682\u65e0\u4e13\u9898',
      emptyDesc: '\u8bf7\u5148\u5728\u540e\u53f0\u914d\u7f6e\u4e13\u9898'
    }
  },

  onLoad(options) {
    const { examId } = options || {};
    this.loadExams(examId || '');
  },

  async loadExams(initialExamId) {
    this.setData({ loading: true });
    try {
      const app = getApp();
      await app.getActivatedExams();
      const res = await api.getExams();
      const allExams = res.data || [];
      const activatedIds = (app.globalData.activatedExams || [])
        .map(item => item.examId && item.examId._id)
        .filter(Boolean);
      const exams = activatedIds.length
        ? allExams.filter(item => activatedIds.includes(item._id))
        : allExams;
      let selectedExamId = initialExamId;
      if (!selectedExamId && exams.length > 0) {
        selectedExamId = exams[0]._id;
      }
      const selectedExam = exams.find(e => e._id === selectedExamId) || {};

      this.setData({
        exams,
        selectedExamId,
        selectedExamName: selectedExam.name || '',
        loading: false
      });

      if (selectedExamId) {
        this.loadTopics(selectedExamId);
      }
    } catch (e) {
      util.showError('\u83b7\u53d6\u79d1\u76ee\u5931\u8d25');
      this.setData({ loading: false });
    }
  },

  async loadTopics(examId) {
    this.setData({ loading: true });
    try {
      const res = await api.getTopics(examId);
      const topics = res.data || [];
      const groups = this.buildGroups(topics);
      this.setData({ topicGroups: groups, loading: false });
    } catch (e) {
      util.showError('\u83b7\u53d6\u4e13\u9898\u5931\u8d25');
      this.setData({ loading: false });
    }
  },

  buildGroups(topics) {
    const byId = new Map(topics.map(t => [String(t._id), t]));
    const parents = topics.filter(t => !t.parentId);
    const children = topics.filter(t => t.parentId);

    const childMap = {};
    children.forEach(c => {
      const key = String(c.parentId);
      if (!childMap[key]) childMap[key] = [];
      childMap[key].push(c);
    });

    const groups = parents.map(p => ({
      ...p,
      children: childMap[String(p._id)] || []
    }));

    const orphanChildren = children.filter(c => !byId.get(String(c.parentId)));
    orphanChildren.forEach(c => {
      groups.push({
        _id: c._id,
        name: c.name,
        children: []
      });
    });

    return groups;
  },

  onExamTap(e) {
    const examId = e.currentTarget.dataset.examId;
    const examName = e.currentTarget.dataset.examName;
    if (examId === this.data.selectedExamId) return;
    this.setData({ selectedExamId: examId, selectedExamName: examName });
    this.loadTopics(examId);
  },

  onStartTopic(e) {
    const topicId = e.currentTarget.dataset.topicId;
    const topicName = e.currentTarget.dataset.topicName;
    const questionCount = Number(e.currentTarget.dataset.questionCount || 0);
    const examId = this.data.selectedExamId;
    if (!topicId || !examId) return;
    if (questionCount <= 0) {
      util.showError('\u8be5\u4e13\u9898\u6682\u65e0\u53ef\u5237\u9898\u76ee');
      return;
    }
    wx.navigateTo({
      url: `/pages/exam/exam?examId=${examId}&topicId=${topicId}&title=${encodeURIComponent(topicName)}`
    });
  },

  onPullDownRefresh() {
    this.loadTopics(this.data.selectedExamId).then(() => wx.stopPullDownRefresh());
  },

  onShareAppMessage() {
    const examName = this.data.selectedExamName || '题库';
    return share.buildSharePayload({
      title: `《${examName}》支持按专题刷题，更适合考前冲刺`
    });
  },

  onShareTimeline() {
    const examName = this.data.selectedExamName || '题库';
    return {
      title: `《${examName}》支持按专题刷题，更适合考前冲刺`
    };
  }
});
