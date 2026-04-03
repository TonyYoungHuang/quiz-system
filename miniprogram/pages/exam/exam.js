const api = require('../../utils/api');
const util = require('../../utils/util');
const latex = require('../../utils/latex');
const practice = require('../../utils/practice');
const questionCache = require('../../utils/questionCache');
const share = require('../../utils/share');

const MAX_RENDER_QUESTIONS = 80;

const MEDIA_HINT_RE = /(上图|下图|图中|图片|图示|如图|看图)/;

const toTextBlocks = (text) => (text ? [{ type: 'text', content: { zh: text } }] : []);

const normalizeBlocks = (blocks, fallbackText) => {
  if (Array.isArray(blocks) && blocks.length > 0) return blocks;
  return toTextBlocks(fallbackText || '');
};

const normalizeOptions = (options) => {
  if (!options) return [];
  if (!Array.isArray(options) && typeof options === 'object') {
    options = Object.keys(options).map(key => ({ key, value: options[key] }));
  }
  if (!Array.isArray(options)) return [];
  return options.map(opt => {
    const contentBlocks = Array.isArray(opt.content) && opt.content.length > 0
      ? opt.content
      : toTextBlocks(opt.value || '');
    return { ...opt, content: contentBlocks };
  });
};

const enrichBlocks = (blocks) => {
  if (!Array.isArray(blocks)) return [];
  return blocks.map(block => {
    if (block.type === 'formula') {
      const html = latex.renderLatexToHtml(block.latex || '', false);
      return { ...block, html };
    }
    return block;
  });
};

const getBlankCount = (question) => {
  if (Array.isArray(question.answer) && question.answer.length > 0) return question.answer.length;
  return 1;
};

const shuffleQuestions = (list = []) => {
  const arr = list.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

const clampQuestionBatch = (list = [], preserveOrder = false) => {
  const source = preserveOrder ? list.slice() : shuffleQuestions(list);
  return source.slice(0, MAX_RENDER_QUESTIONS);
};

const countAnswerableQuestions = (questions = []) => questions.reduce((total, question) => {
  if (question.type === 'CASE') {
    return total + countAnswerableQuestions(question.children || []);
  }
  return total + 1;
}, 0);

const normalizeQuestion = (question, parentId, childIndex) => {
  const stem = enrichBlocks(normalizeBlocks(question.stem, question.content));
  const analysis = enrichBlocks(normalizeBlocks(question.analysis, question.explanation));
  const options = normalizeOptions(question.options || []).map(opt => ({
    ...opt,
    content: enrichBlocks(opt.content || [])
  }));
  const media = Array.isArray(question.media) && question.media.length > 0
    ? question.media
    : (question.mediaUrl ? [{ type: 'image', url: question.mediaUrl }] : []);
  const id = question._id || (parentId ? `${parentId}__${childIndex}` : undefined);
  const blankCount = question.type === 'BLANK' ? getBlankCount(question) : 0;
  const children = Array.isArray(question.children)
    ? question.children.map((child, idx) => normalizeQuestion(child, question._id || parentId || 'case', idx))
    : [];
  const stemText = stem
    .map(block => (block.type === 'text' && block.content ? (block.content.zh || '') : ''))
    .join(' ');
  const guessedNeedsMedia = !media.length && MEDIA_HINT_RE.test(`${question.content || ''} ${stemText}`);

  return {
    ...question,
    _id: id,
    stem,
    analysis,
    options,
    media,
    needsMediaReview: question.needsMediaReview === true || guessedNeedsMedia,
    mediaReviewReason: question.mediaReviewReason || (guessedNeedsMedia ? '该题题干提到了图片或图示，但当前还没有可展示的图片资源，请在后台补图后再复习。' : ''),
    children,
    blankCount,
    blankCountArray: blankCount > 0 ? Array.from({ length: blankCount }) : [],
    typeName: util.getQuestionTypeName(question.type),
    typeColor: util.getQuestionTypeColor(question.type)
  };
};

Page({
  data: {
    examId: '',
    examName: '',
    topicId: '',
    paperId: '',
    targetQuestionId: '',
    practiceMode: 'regular',
    questions: [],
    currentIndex: 0,
    queueQuestionCount: 0,
    questionBankCount: 0,
    userAnswers: {},
    showResult: false,
    showSheet: false,
    answeredCount: 0,
    correctCount: 0,
    favoriteIds: [],
    userId: '',
    ui: {
      back: '返回',
      sheet: '目录',
      progressPrefix: '第',
      progressSuffix: '题',
      totalHintPrefix: '题库共',
      remainingHintPrefix: '本轮剩余新题',
      blankPlaceholder: '填空',
      shortPlaceholder: '请输入答案',
      analysisTitle: '答案解析',
      correctAnswer: '正确答案：',
      mediaMissingTitle: '原题需要配图',
      mediaMissingDesc: '当前还没有补上原题图片，请在后台题目管理中补图后再复习。',
      submit: '提交答案',
      next: '下一题',
      viewResult: '查看结果',
      sheetTitle: '答题卡',
      answered: '已答',
      unanswered: '未答'
    }
  },

  onLoad(options) {
    const { examId, examName, title, topicId, paperId, mode, questionId } = options || {};
    const displayTitle = title ? decodeURIComponent(title) : (examName ? decodeURIComponent(examName) : '');
    this.setData({
      examId,
      examName: displayTitle,
      topicId: topicId || '',
      paperId: paperId || '',
      targetQuestionId: questionId || '',
      practiceMode: mode === 'wrong' ? 'wrong' : (mode === 'favorite' ? 'favorite' : 'regular')
    });
    this.loadQuestions();
  },

  onHide() {
    this.persistProgress();
  },

  onUnload() {
    this.persistProgress();
  },

  isRegularPractice() {
    return this.data.practiceMode !== 'wrong' && !this.data.topicId && !this.data.paperId;
  },

  isWrongPractice() {
    return this.data.practiceMode === 'wrong';
  },

  isFavoritePractice() {
    return this.data.practiceMode === 'favorite';
  },

  getQuestionRequestParams() {
    return {
      examId: this.data.examId,
      topicId: this.data.topicId || '',
      paperId: this.data.paperId || '',
      type: ''
    };
  },

  applyFavoriteFlags(questions, favoriteIds) {
    const favoriteSet = new Set(favoriteIds || []);
    const visit = (list = []) => list.map(item => ({
      ...item,
      isFavorite: favoriteSet.has(item._id),
      children: Array.isArray(item.children) ? visit(item.children) : item.children
    }));
    return visit(questions);
  },

  hasQuestionAnswer(question, answers = this.data.userAnswers) {
    if (!question) return false;
    const answer = answers[question._id];
    if (question.type === 'BLANK') return Array.isArray(answer) && answer.some(v => v && String(v).trim());
    if (question.type === 'SHORT' || question.type === 'CALC') return typeof answer === 'string' && answer.trim();
    if (question.type === 'CASE') return Array.isArray(question.children) && question.children.some(child => this.hasQuestionAnswer(child, answers));
    if (Array.isArray(answer)) return answer.length > 0;
    return !!answer;
  },

  getCurrentQuestion() {
    return this.data.questions[this.data.currentIndex];
  },

  getCurrentQueueIds() {
    return (this.data.questions || []).map(item => item._id).filter(Boolean);
  },

  findResumeIndex() {
    const { questions, currentIndex } = this.data;
    let idx = currentIndex;
    while (idx < questions.length && this.hasQuestionAnswer(questions[idx])) {
      idx += 1;
    }
    return Math.min(idx, questions.length);
  },

  persistProgress(nextIndex) {
    if (!this.isRegularPractice() || !this.data.userId || !this.data.examId || !this.data.questions.length) {
      return;
    }

    const queueIds = this.getCurrentQueueIds();
    const resumeIndex = typeof nextIndex === 'number' ? nextIndex : this.findResumeIndex();
    if (!queueIds.length || resumeIndex >= queueIds.length) {
      practice.clearExamProgress(this.data.userId, this.data.examId);
      return;
    }

    practice.saveExamProgress(this.data.userId, this.data.examId, {
      queueIds,
      currentIndex: resumeIndex,
      mode: 'regular',
      version: 2
    });
  },

  restoreQuestionsByQueue(allQuestions, queueIds = []) {
    const map = new Map((allQuestions || []).map(item => [item._id, item]));
    return queueIds.map(id => map.get(id)).filter(Boolean);
  },

  buildSessionSummary() {
    const { questions } = this.data;
    const total = countAnswerableQuestions(questions);
    let answeredCount = 0;
    let correctCount = 0;

    const visit = (question) => {
      if (question.type === 'CASE') {
        (question.children || []).forEach(child => visit(child));
        return;
      }
      if (this.hasQuestionAnswer(question)) {
        answeredCount += 1;
        if (this.checkQuestionCorrect(question)) {
          correctCount += 1;
        }
      }
    };

    questions.forEach(item => visit(item));

    return {
      total,
      answeredCount,
      correctCount,
      wrongCount: Math.max(answeredCount - correctCount, 0),
      remainingCount: Math.max(total - answeredCount, 0)
    };
  },

  openResultPage(summary, canResume = false) {
    const { examId, examName, topicId, paperId, practiceMode } = this.data;
    const query = [
      `total=${summary.total || 0}`,
      `correct=${summary.correctCount || 0}`,
      `answered=${summary.answeredCount || 0}`,
      `remaining=${summary.remainingCount || 0}`,
      `examId=${encodeURIComponent(examId || '')}`,
      `title=${encodeURIComponent(examName || '')}`,
      `mode=${practiceMode || 'regular'}`,
      `resume=${canResume ? 1 : 0}`
    ];
    if (topicId) query.push(`topicId=${encodeURIComponent(topicId)}`);
    if (paperId) query.push(`paperId=${encodeURIComponent(paperId)}`);

    wx.redirectTo({
      url: `/pages/result/result?${query.join('&')}`
    });
  },

  async loadQuestions() {
    util.showLoading('加载题目中...');

    try {
      const app = getApp();
      const userId = await app.ensureUserIdentity();
      const requestParams = this.getQuestionRequestParams();
      let sourceQuestions = questionCache.getCache(requestParams);

      if (!Array.isArray(sourceQuestions) || sourceQuestions.length === 0) {
        const res = await api.getQuestions(this.data.examId, {
          userId,
          topicId: this.data.topicId || undefined,
          paperId: this.data.paperId || undefined
        });
        sourceQuestions = res.data || [];
        questionCache.setCache(requestParams, sourceQuestions);
      }

      const allQuestions = sourceQuestions.map(q => normalizeQuestion(q));
      const questionBankCount = countAnswerableQuestions(allQuestions);
      const records = practice.getExamRecords(userId, this.data.examId);
      const answeredIds = new Set(practice.getAnsweredQuestionIds(userId, this.data.examId));
      const wrongIds = new Set(practice.getPendingWrongQuestionIds(userId, this.data.examId));
      const favoriteIds = practice.getFavoriteQuestionIds(userId, this.data.examId);
      let questions = [];
      let currentIndex = 0;
      let userAnswers = {};

      if (this.isWrongPractice()) {
        questions = clampQuestionBatch(allQuestions.filter(item => wrongIds.has(item._id)), true);
        if (!questions.length) {
          util.hideLoading();
          wx.showModal({
            title: '提示',
            content: '当前错题本为空，继续保持。',
            showCancel: false,
            success: () => wx.navigateBack()
          });
          return;
        }
      } else if (this.isFavoritePractice()) {
        questions = clampQuestionBatch(allQuestions.filter(item => favoriteIds.includes(item._id)), true);
        if (!questions.length) {
          util.hideLoading();
          wx.showModal({
            title: '提示',
            content: '当前收藏夹为空，先去做题时收藏一些重点题吧。',
            showCancel: false,
            success: () => wx.navigateBack()
          });
          return;
        }
      } else if (this.isRegularPractice()) {
        const progress = practice.getExamProgress(userId, this.data.examId);
        if (progress && Array.isArray(progress.queueIds) && progress.queueIds.length) {
          if (!progress.version && allQuestions.length > progress.queueIds.length) {
            practice.clearExamProgress(userId, this.data.examId);
          } else {
          questions = this.restoreQuestionsByQueue(allQuestions, progress.queueIds);
          currentIndex = Math.max(0, Math.min(progress.currentIndex || 0, Math.max(questions.length - 1, 0)));
          questions.forEach(item => {
            if (records[item._id] && records[item._id].answeredAt) {
              userAnswers[item._id] = records[item._id].lastUserAnswer;
            }
          });
          while (currentIndex < questions.length && this.hasQuestionAnswer(questions[currentIndex], userAnswers)) {
            currentIndex += 1;
          }
          if (!questions.length || currentIndex >= questions.length) {
            questions = [];
            currentIndex = 0;
            userAnswers = {};
            practice.clearExamProgress(userId, this.data.examId);
          } else {
            util.showSuccess('已恢复上次进度');
          }
          }
        }

        if (!questions.length) {
          questions = clampQuestionBatch(allQuestions.filter(item => !answeredIds.has(item._id)));
          currentIndex = 0;
          userAnswers = {};
          if (questions.length) {
            practice.saveExamProgress(userId, this.data.examId, {
              queueIds: questions.map(item => item._id),
              currentIndex: 0,
              mode: 'regular',
              version: 2
            });
          }
        }

        if (!questions.length) {
          util.hideLoading();
          wx.showModal({
            title: '提示',
            content: '当前没有新的题目了，可前往错题本继续复习。',
            showCancel: false,
            success: () => wx.navigateBack()
          });
          return;
        }
      } else {
        questions = this.data.paperId
          ? clampQuestionBatch(allQuestions, true)
          : clampQuestionBatch(allQuestions);
      }

      questions = this.applyFavoriteFlags(questions, favoriteIds);

      if (!questions.length) {
        questionCache.clearCache(requestParams);
        util.hideLoading();
        wx.showModal({
          title: '提示',
          content: '当前没有可显示的题目了，可能是后台刚删除或调整了题目，请返回后重新进入。',
          showCancel: false,
          success: () => wx.navigateBack()
        });
        return;
      }

      const targetQuestionId = this.data.targetQuestionId;
      if (targetQuestionId) {
        const targetIndex = questions.findIndex(item => item._id === targetQuestionId);
        if (targetIndex >= 0) {
          currentIndex = targetIndex;
        }
      }

      currentIndex = Math.max(0, Math.min(currentIndex, Math.max(questions.length - 1, 0)));

      this.setData({
        questions,
        currentIndex,
        queueQuestionCount: countAnswerableQuestions(questions),
        questionBankCount,
        userAnswers,
        favoriteIds,
        userId,
        showResult: false
      });
      this.refreshSummary();
      util.hideLoading();
    } catch (error) {
      console.error('[exam] loadQuestions failed', error);
      util.hideLoading();
      util.showError('获取题目失败');
    }
  },

  refreshSummary() {
    const summary = this.buildSessionSummary();
    this.setData({
      answeredCount: summary.answeredCount,
      correctCount: summary.correctCount
    });
  },

  onToggleFavorite() {
    const currentQuestion = this.getCurrentQuestion();
    if (!currentQuestion || !currentQuestion._id || !this.data.userId) return;

    const result = practice.toggleFavoriteQuestion(this.data.userId, this.data.examId, currentQuestion);
    const favoriteIds = practice.getFavoriteQuestionIds(this.data.userId, this.data.examId);
    const questions = this.applyFavoriteFlags(this.data.questions, favoriteIds);

    this.setData({
      questions,
      favoriteIds
    });

    util.showSuccess(result.isFavorite ? '已加入收藏夹' : '已取消收藏');
  },

  checkQuestionCorrect(question) {
    const userAnswer = this.data.userAnswers[question._id];
    if (!userAnswer) return false;

    if (question.type === 'MULTI') {
      const userArr = Array.isArray(userAnswer) ? userAnswer.slice() : [userAnswer];
      const correctArr = Array.isArray(question.answer) ? question.answer.slice() : [question.answer];
      return JSON.stringify(userArr.sort()) === JSON.stringify(correctArr.sort());
    }

    if (question.type === 'BLANK') {
      if (!Array.isArray(question.answer)) return false;
      const userArr = Array.isArray(userAnswer) ? userAnswer : [userAnswer];
      return JSON.stringify(userArr.map(v => (v || '').trim())) === JSON.stringify(question.answer.map(v => (v || '').trim()));
    }

    if (question.type === 'SHORT' || question.type === 'CALC') {
      return false;
    }

    return userAnswer === question.answer;
  },

  onBack() {
    wx.showModal({
      title: '提示',
      content: '确定要退出答题吗？',
      success: (res) => {
        if (!res.confirm) return;

        const summary = this.buildSessionSummary();
        if (this.isRegularPractice() && summary.answeredCount > 0) {
          this.persistProgress();
          this.openResultPage(summary, summary.remainingCount > 0);
          return;
        }

        wx.navigateBack();
      }
    });
  },

  onShowAnswerSheet() {
    this.setData({ showSheet: true });
  },

  onHideAnswerSheet() {
    this.setData({ showSheet: false });
  },

  onStopPropagation() {},

  onJumpToQuestion(e) {
    const index = e.currentTarget.dataset.index;
    this.setData({
      currentIndex: index,
      showSheet: false,
      showResult: false
    });
    this.persistProgress(index);
  },

  onSwiperChange(e) {
    const currentIndex = e.detail.current;
    this.setData({
      currentIndex,
      showResult: false
    });
    this.persistProgress(currentIndex);
  },

  onPreviewImage(e) {
    const url = e.currentTarget.dataset.url;
    if (!url) return;

    wx.previewImage({
      current: url,
      urls: [url]
    });
  },

  onSelectOption(e) {
    if (this.data.showResult) return;

    const { questionId, option } = e.currentTarget.dataset;
    const { questions, userAnswers } = this.data;
    const question = questions.find(q => q._id === questionId);
    if (!question) return;

    if (question.type === 'MULTI') {
      let answers = userAnswers[questionId] || [];
      if (answers.includes(option)) {
        answers = answers.filter(a => a !== option);
      } else {
        answers = [...answers, option];
      }
      answers.sort();
      userAnswers[questionId] = answers;
    } else {
      userAnswers[questionId] = option;
    }

    this.setData({ userAnswers });
    this.refreshSummary();
  },

  onBlankInput(e) {
    const { questionId, blankIndex } = e.currentTarget.dataset;
    const value = e.detail.value || '';
    const { userAnswers } = this.data;
    const current = Array.isArray(userAnswers[questionId]) ? userAnswers[questionId] : [];
    current[blankIndex] = value;
    userAnswers[questionId] = current;
    this.setData({ userAnswers });
    this.refreshSummary();
  },

  onTextAnswerInput(e) {
    const { questionId } = e.currentTarget.dataset;
    const value = e.detail.value || '';
    const { userAnswers } = this.data;
    userAnswers[questionId] = value;
    this.setData({ userAnswers });
    this.refreshSummary();
  },

  async onSubmitAnswer() {
    const currentQuestion = this.getCurrentQuestion();
    if (!currentQuestion) return;

    try {
      const app = getApp();
      const userId = await app.ensureUserIdentity();
      const isCorrect = this.checkQuestionCorrect(currentQuestion);

      if (currentQuestion.type !== 'CASE') {
        practice.upsertQuestionRecord(
          userId,
          this.data.examId,
          currentQuestion,
          this.data.userAnswers[currentQuestion._id],
          isCorrect
        );
      }

      if (this.isRegularPractice()) {
        this.persistProgress(this.data.currentIndex);
      }

      this.setData({ showResult: true });
      this.refreshSummary();
    } catch (error) {
      console.error('[exam] submit answer failed', error);
      util.showError('提交失败');
    }
  },

  onNextQuestion() {
    const { currentIndex, questions } = this.data;
    if (currentIndex < questions.length - 1) {
      const nextIndex = currentIndex + 1;
      this.setData({
        currentIndex: nextIndex,
        showResult: false
      });
      this.persistProgress(nextIndex);
    }
  },

  onFinishExam() {
    const summary = this.buildSessionSummary();
    let canResume = false;

    if (this.isRegularPractice()) {
      const answeredCount = practice.getAnsweredQuestionIds(this.data.userId, this.data.examId).length;
      canResume = (this.data.questionBankCount || 0) > answeredCount;
    }

    if (this.isRegularPractice()) {
      practice.clearExamProgress(this.data.userId, this.data.examId);
    }
    this.openResultPage(summary, canResume);
  },

  onShareAppMessage() {
    const examName = this.data.examName || '题库';
    const title = this.isWrongPractice()
      ? `我正在复习《${examName}》错题，一起来刷题吧`
      : `我正在练习《${examName}》，一起来刷题吧`;
    return share.buildSharePayload({ title });
  },

  onShareTimeline() {
    const examName = this.data.examName || '题库';
    return {
      title: this.isWrongPractice()
        ? `我正在复习《${examName}》错题`
        : `我正在练习《${examName}》`
    };
  }
});
