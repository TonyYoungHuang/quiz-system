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
    navBar: {
      statusBarHeight: 20,
      navHeight: 44,
      heroOffset: 44
    },
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
    batchStart: 0,
    ui: {
      back: '\u8fd4\u56de',
      sheet: '\u76ee\u5f55',
      progressPrefix: '\u7b2c',
      progressSuffix: '\u9898',
      totalHintPrefix: '\u9898\u5e93\u5171',
      remainingHintPrefix: '\u672c\u8f6e\u5269\u4f59',
      blankPlaceholder: '\u586b\u7a7a',
      shortPlaceholder: '\u8bf7\u8f93\u5165\u7b54\u6848',
      analysisTitle: '\u7b54\u6848\u89e3\u6790',
      correctAnswer: '\u6b63\u786e\u7b54\u6848\uff1a',
      mediaMissingTitle: '\u539f\u9898\u9700\u8981\u914d\u56fe',
      mediaMissingDesc: '\u5f53\u524d\u8fd8\u6ca1\u6709\u8865\u4e0a\u539f\u9898\u56fe\u7247\uff0c\u8bf7\u5728\u540e\u53f0\u9898\u76ee\u7ba1\u7406\u4e2d\u8865\u56fe\u540e\u518d\u590d\u4e60\u3002',
      submit: '\u63d0\u4ea4\u7b54\u6848',
      next: '\u4e0b\u4e00\u9898',
      viewResult: '\u67e5\u770b\u7ed3\u679c',
      sheetTitle: '\u7b54\u9898\u5361',
      answered: '\u5df2\u7b54',
      unanswered: '\u672a\u7b54',
      favorite: '\u6536\u85cf',
      favorited: '\u5df2\u6536\u85cf',
      referenceTitle: '\u53c2\u8003\u7b54\u6848\u9898',
      referenceDesc: '\u672c\u9898\u6682\u4e0d\u652f\u6301\u4f5c\u7b54\u8f93\u5165\uff0c\u70b9\u51fb\u63d0\u4ea4\u540e\u76f4\u63a5\u67e5\u770b\u53c2\u8003\u7b54\u6848\u3002'
    }
  },

  onLoad(options) {
    this.setupCustomNavBar();
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
    this.allQuestions = [];
    this.currentBatchStart = 0;
    this.loadQuestions();
  },

  setupCustomNavBar() {
    const systemInfo = wx.getSystemInfoSync ? wx.getSystemInfoSync() : {};
    const statusBarHeight = systemInfo.statusBarHeight || 20;
    let navHeight = 44;
    let heroOffset = 44;

    if (wx.getMenuButtonBoundingClientRect) {
      const menuButton = wx.getMenuButtonBoundingClientRect();
      if (menuButton && menuButton.top) {
        const verticalPadding = Math.max(menuButton.top - statusBarHeight, 6);
        navHeight = menuButton.height + verticalPadding * 2;
        heroOffset = Math.max((menuButton.bottom || (menuButton.top + menuButton.height)) - statusBarHeight, menuButton.height);
      }
    }

    this.setData({
      navBar: {
        statusBarHeight,
        navHeight,
        heroOffset
      }
    });
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

  isSequentialPractice() {
    return !!this.data.topicId || !!this.data.paperId;
  },

  isReferenceOnlyQuestion(question) {
    return this.isSequentialPractice() && question && (question.type === 'SHORT' || question.type === 'CALC');
  },

  isAutoFullScoreQuestion(question) {
    return !!(question && question.autoFullScore === true);
  },

  getProgressScope() {
    if (this.isWrongPractice()) return { mode: 'wrong' };
    if (this.isFavoritePractice()) return { mode: 'favorite' };
    if (this.data.topicId) return { mode: 'topic', topicId: this.data.topicId };
    if (this.data.paperId) return { mode: 'paper', paperId: this.data.paperId };
    return { mode: 'regular' };
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

  findQuestionById(questionId, questions = this.data.questions) {
    const visit = (list = []) => {
      for (let i = 0; i < list.length; i += 1) {
        const question = list[i];
        if (!question) continue;
        if (question._id === questionId) return question;
        if (question.type === 'CASE' && Array.isArray(question.children)) {
          const childMatch = visit(question.children);
          if (childMatch) return childMatch;
        }
      }
      return null;
    };

    return visit(questions);
  },

  normalizeQueueQuestionIds(questionIds = []) {
    const seen = new Set();
    return (questionIds || []).map(id => {
      const normalized = String(id || '').trim();
      if (!normalized) return '';
      return normalized.split('__')[0];
    }).filter(id => {
      if (!id || seen.has(id)) return false;
      seen.add(id);
      return true;
    });
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

  findFirstUnansweredIndex(answers = this.data.userAnswers) {
    const { questions } = this.data;
    for (let idx = 0; idx < questions.length; idx += 1) {
      if (!this.hasQuestionAnswer(questions[idx], answers)) {
        return idx;
      }
    }
    return questions.length;
  },

  persistProgress(nextIndex) {
    if ((!this.isRegularPractice() && !this.isSequentialPractice()) || !this.data.userId || !this.data.examId || !this.data.questions.length) {
      return;
    }

    const queueIds = this.getCurrentQueueIds();
    const resumeIndex = typeof nextIndex === 'number' ? nextIndex : this.findResumeIndex();
    const scope = this.getProgressScope();
    if (!queueIds.length || resumeIndex >= queueIds.length) {
      practice.clearExamProgress(this.data.userId, this.data.examId, scope);
      return;
    }

    practice.saveExamProgress(this.data.userId, this.data.examId, {
      queueIds,
      currentIndex: resumeIndex,
      mode: scope.mode,
      version: 3,
      topicId: this.data.topicId || '',
      paperId: this.data.paperId || '',
      batchStart: this.data.batchStart || 0
    }, scope);
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
      const permissionRes = await api.checkPermission(userId, this.data.examId);
      if (!permissionRes || permissionRes.hasPermission !== true) {
        util.hideLoading();
        wx.showModal({
          title: '提示',
          content: '当前科目尚未激活，请先使用激活码开通后再刷题。',
          confirmText: '去激活',
          success: (res) => {
            if (res.confirm) {
              app.globalData.pendingActivateExam = {
                examId: this.data.examId,
                examName: this.data.examName
              };
              wx.switchTab({ url: '/pages/activate/activate' });
              return;
            }
            wx.navigateBack({ delta: 1 });
          }
        });
        return;
      }
      const requestParams = this.getQuestionRequestParams();
      const records = practice.getExamRecords(userId, this.data.examId);
      const answeredIds = new Set(practice.getAnsweredQuestionIds(userId, this.data.examId));
      const wrongIds = new Set(practice.getPendingWrongQuestionIds(userId, this.data.examId));
      const favoriteIds = practice.getFavoriteQuestionIds(userId, this.data.examId);
      const scope = this.getProgressScope();
      const regularProgress = this.isRegularPractice()
        ? practice.getExamProgress(userId, this.data.examId, scope)
        : null;
      const sequentialProgress = this.isSequentialPractice()
        ? practice.getExamProgress(userId, this.data.examId, scope)
        : null;

      let sourceQuestions = null;
      let totalCountFromServer = 0;
      const canUseCache = false;

      if (canUseCache) {
        sourceQuestions = questionCache.getCache(requestParams);
      }

      if (!Array.isArray(sourceQuestions) || sourceQuestions.length === 0) {
        const fetchOptions = {
          userId,
          topicId: this.data.topicId || undefined,
          paperId: this.data.paperId || undefined
        };

        if (this.isWrongPractice()) {
          const wrongQuestionIds = this.normalizeQueueQuestionIds(Array.from(wrongIds));
          if (!wrongQuestionIds.length) {
            util.hideLoading();
            wx.showModal({
              title: '提示',
              content: '当前错题本为空，继续保持。',
              showCancel: false,
              success: () => wx.navigateBack()
            });
            return;
          }
          fetchOptions.questionIds = wrongQuestionIds;
        } else if (this.isFavoritePractice()) {
          if (!favoriteIds.length) {
            util.hideLoading();
            wx.showModal({
              title: '提示',
              content: '当前收藏夹为空，先去做题时收藏一些重点题吧。',
              showCancel: false,
              success: () => wx.navigateBack()
            });
            return;
          }
          fetchOptions.questionIds = favoriteIds;
        } else if (this.isRegularPractice()) {
          if (regularProgress && Array.isArray(regularProgress.queueIds) && regularProgress.queueIds.length) {
            fetchOptions.questionIds = regularProgress.queueIds;
          } else {
            fetchOptions.excludeIds = Array.from(answeredIds);
            fetchOptions.limit = MAX_RENDER_QUESTIONS;
          }
        } else if (this.isSequentialPractice()) {
          if (sequentialProgress && Array.isArray(sequentialProgress.queueIds) && sequentialProgress.queueIds.length) {
            fetchOptions.questionIds = sequentialProgress.queueIds;
          } else {
            fetchOptions.limit = MAX_RENDER_QUESTIONS;
            fetchOptions.skip = this.currentBatchStart || 0;
          }
        }

        const res = await api.getQuestions(this.data.examId, fetchOptions);
        sourceQuestions = res.data || [];
        totalCountFromServer = Number(res.totalCount) || 0;

        if (canUseCache) {
          questionCache.setCache(requestParams, sourceQuestions);
        }
      }

      const allQuestions = (sourceQuestions || []).map(q => normalizeQuestion(q));
      this.allQuestions = allQuestions;
      const questionBankCount = totalCountFromServer || countAnswerableQuestions(allQuestions);
      let questions = [];
      let currentIndex = 0;
      let userAnswers = {};
      this.currentBatchStart = 0;

      if (this.isWrongPractice()) {
        const wrongQueueIds = new Set(this.normalizeQueueQuestionIds(Array.from(wrongIds)));
        questions = clampQuestionBatch(allQuestions.filter(item => wrongQueueIds.has(item._id)), true);
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
        const progress = regularProgress;
        if (progress && Array.isArray(progress.queueIds) && progress.queueIds.length) {
          if (!progress.version && allQuestions.length > progress.queueIds.length) {
            practice.clearExamProgress(userId, this.data.examId, scope);
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
            practice.clearExamProgress(userId, this.data.examId, scope);
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
              version: 3,
              batchStart: 0
            }, scope);
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
      } else if (this.isSequentialPractice()) {
        const progress = sequentialProgress;
        if (progress && Array.isArray(progress.queueIds) && progress.queueIds.length) {
          questions = this.restoreQuestionsByQueue(allQuestions, progress.queueIds);
          currentIndex = Math.max(0, Math.min(progress.currentIndex || 0, Math.max(questions.length - 1, 0)));
          questions.forEach(item => {
            if (records[item._id] && records[item._id].answeredAt) {
              userAnswers[item._id] = records[item._id].lastUserAnswer;
            }
            (item.children || []).forEach(child => {
              if (records[child._id] && records[child._id].answeredAt) {
                userAnswers[child._id] = records[child._id].lastUserAnswer;
              }
            });
          });
          this.currentBatchStart = Number(progress.batchStart) || 0;
          while (currentIndex < questions.length && this.hasQuestionAnswer(questions[currentIndex], userAnswers)) {
            currentIndex += 1;
          }
          if (!questions.length || currentIndex >= questions.length) {
            const nextBatchStart = (Number(progress.batchStart) || 0) + questions.length;
            questions = [];
            currentIndex = 0;
            userAnswers = {};
            this.currentBatchStart = nextBatchStart;
            practice.clearExamProgress(userId, this.data.examId, scope);
          }
        }

        if (!questions.length) {
          const batchStart = this.currentBatchStart || 0;
          questions = allQuestions.slice(batchStart, batchStart + MAX_RENDER_QUESTIONS);
          currentIndex = 0;
          userAnswers = {};
          this.currentBatchStart = batchStart;
          if (questions.length) {
            practice.saveExamProgress(userId, this.data.examId, {
              queueIds: questions.map(item => item._id),
              currentIndex: 0,
              mode: scope.mode,
              version: 3,
              topicId: this.data.topicId || '',
              paperId: this.data.paperId || '',
              batchStart
            }, scope);
          }
        }
      } else {
        questions = clampQuestionBatch(allQuestions);
      }

      questions = this.applyFavoriteFlags(questions, favoriteIds);

      if (!questions.length) {
        if (canUseCache) {
          questionCache.clearCache(requestParams);
        }
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
        showResult: false,
        batchStart: this.currentBatchStart || 0
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

  checkQuestionCorrect(question, answers = this.data.userAnswers) {
    const userAnswer = answers[question._id];
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
      if (this.isAutoFullScoreQuestion(question)) return true;
      return this.isReferenceOnlyQuestion(question) && !!userAnswer;
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
        if ((this.isRegularPractice() || this.isSequentialPractice()) && summary.answeredCount > 0) {
          this.persistProgress();
          this.openResultPage(summary, this.canResume(summary));
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
    const { userAnswers } = this.data;
    const question = this.findQuestionById(questionId);
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
    const question = this.findQuestionById(questionId);
    if (!question) return;
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
    const question = this.findQuestionById(questionId);
    if (!question) return;
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
      const userAnswers = { ...this.data.userAnswers };

      if (currentQuestion.type === 'CASE') {
        let hasAnsweredChild = false;
        (currentQuestion.children || []).forEach(child => {
          if (this.isReferenceOnlyQuestion(child) && !userAnswers[child._id]) {
            userAnswers[child._id] = '__REFERENCE_VIEWED__';
          }
          if (!this.hasQuestionAnswer(child, userAnswers)) return;
          hasAnsweredChild = true;
          practice.upsertQuestionRecord(
            userId,
            this.data.examId,
            child,
            userAnswers[child._id],
            (this.isReferenceOnlyQuestion(child) || this.isAutoFullScoreQuestion(child))
              ? true
              : this.checkQuestionCorrect(child, userAnswers)
          );
        });
        if (!hasAnsweredChild) {
          util.showError('璇峰厛瀹屾垚褰撳墠棰樼洰');
          return;
        }
        if (this.isRegularPractice() || this.isSequentialPractice()) {
          this.persistProgress(this.data.currentIndex);
        }
        this.setData({ showResult: true, userAnswers });
        this.refreshSummary();
        return;
      }

      if (this.isReferenceOnlyQuestion(currentQuestion) && !userAnswers[currentQuestion._id]) {
        userAnswers[currentQuestion._id] = '__REFERENCE_VIEWED__';
      }

      const isCorrect = (this.isReferenceOnlyQuestion(currentQuestion) || this.isAutoFullScoreQuestion(currentQuestion))
        ? true
        : this.checkQuestionCorrect(currentQuestion, userAnswers);

      practice.upsertQuestionRecord(
        userId,
        this.data.examId,
        currentQuestion,
        userAnswers[currentQuestion._id],
        isCorrect
      );

      if (this.isRegularPractice() || this.isSequentialPractice()) {
        this.persistProgress(this.data.currentIndex);
      }

      this.setData({ showResult: true, userAnswers });
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
      practice.clearExamProgress(this.data.userId, this.data.examId, this.getProgressScope());
    } else if (this.isSequentialPractice()) {
      if (summary.remainingCount > 0) {
        const resumeIndex = this.findFirstUnansweredIndex();
        practice.saveExamProgress(this.data.userId, this.data.examId, {
          queueIds: (this.data.questions || []).map(item => item._id),
          currentIndex: resumeIndex,
          mode: this.getProgressScope().mode,
          version: 3,
          topicId: this.data.topicId || '',
          paperId: this.data.paperId || '',
          batchStart: this.data.batchStart || 0
        }, this.getProgressScope());
        canResume = true;
      } else {
        const nextBatchStart = (this.data.batchStart || 0) + (this.data.questions || []).length;
        if (nextBatchStart < (this.data.questionBankCount || 0)) {
          const nextQuestions = (this.allQuestions || []).slice(nextBatchStart, nextBatchStart + MAX_RENDER_QUESTIONS);
          if (nextQuestions.length) {
            practice.saveExamProgress(this.data.userId, this.data.examId, {
              queueIds: nextQuestions.map(item => item._id),
              currentIndex: 0,
              mode: this.getProgressScope().mode,
              version: 3,
              topicId: this.data.topicId || '',
              paperId: this.data.paperId || '',
              batchStart: nextBatchStart
            }, this.getProgressScope());
            canResume = true;
          }
        } else {
          practice.clearExamProgress(this.data.userId, this.data.examId, this.getProgressScope());
        }
      }
    }
    this.openResultPage(summary, canResume);
  },

  canResume(summary) {
    if (this.isRegularPractice()) {
      return summary.remainingCount > 0;
    }
    if (this.isSequentialPractice()) {
      if (summary.remainingCount > 0) return true;
      return ((this.data.batchStart || 0) + (this.data.questions || []).length) < (this.data.questionBankCount || 0);
    }
    return false;
  },

  onShareAppMessage() {
    const examName = this.data.examName || '\u9898\u5e93';
    const title = this.isWrongPractice()
      ? `\u6211\u6b63\u5728\u590d\u4e60\u300a${examName}\u300b\u9519\u9898\uff0c\u4e00\u8d77\u6765\u5237\u9898\u5427`
      : `\u6211\u6b63\u5728\u7ec3\u4e60\u300a${examName}\u300b\uff0c\u4e00\u8d77\u6765\u5237\u9898\u5427`;
    return share.buildSharePayload({ title });
  },

  onShareTimeline() {
    const examName = this.data.examName || '\u9898\u5e93';
    return {
      title: this.isWrongPractice()
        ? `\u6211\u6b63\u5728\u590d\u4e60\u300a${examName}\u300b\u9519\u9898`
        : `\u6211\u6b63\u5728\u7ec3\u4e60\u300a${examName}\u300b`
    };
  }
});
