// pages/exam/exam.js
const api = require('../../utils/api');
const util = require('../../utils/util');
const latex = require('../../utils/latex');

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

const getBlankCount = (q) => {
  if (Array.isArray(q.answer) && q.answer.length > 0) return q.answer.length;
  return 1;
};

const normalizeQuestion = (q, parentId, childIndex) => {
  const stem = enrichBlocks(normalizeBlocks(q.stem, q.content));
  const analysis = enrichBlocks(normalizeBlocks(q.analysis, q.explanation));
  const options = normalizeOptions(q.options || []).map(opt => ({
    ...opt,
    content: enrichBlocks(opt.content || [])
  }));
  const media = Array.isArray(q.media) && q.media.length > 0
    ? q.media
    : (q.mediaUrl ? [{ type: 'image', url: q.mediaUrl }] : []);
  const id = q._id || (parentId ? `${parentId}__${childIndex}` : undefined);
  const blankCount = q.type === 'BLANK' ? getBlankCount(q) : 0;

  const children = Array.isArray(q.children)
    ? q.children.map((c, idx) => normalizeQuestion(c, q._id || parentId || 'case', idx))
    : [];

  return {
    ...q,
    _id: id,
    stem,
    analysis,
    options,
    media,
    children,
    blankCount,
    blankCountArray: blankCount > 0 ? Array.from({ length: blankCount }) : [],
    typeName: util.getQuestionTypeName(q.type),
    typeColor: util.getQuestionTypeColor(q.type)
  };
};

Page({
  data: {
    examId: '',
    examName: '',
    questions: [],
    currentIndex: 0,
    userAnswers: {},
    showResult: false,
    showSheet: false,
    answeredCount: 0,
    correctCount: 0
  },

  onLoad(options) {
    const { examId, examName } = options;
    this.setData({
      examId,
      examName: decodeURIComponent(examName)
    });
    this.loadQuestions();
  },

  async loadQuestions() {
    util.showLoading('加载题目中...');

    try {
      const res = await api.getQuestions(this.data.examId);
      const questions = res.data.map(q => normalizeQuestion(q));
      this.setData({ questions });
      util.hideLoading();
    } catch (error) {
      console.error('[exam] ??????', error);
      util.hideLoading();
      util.showError('加载题目失败');
    }
  },

  
  
  onBack() {
    wx.showModal({
      title: '提示',
      content: '确定要退出答题吗?',
      success: (res) => {
        if (res.confirm) {
          wx.navigateBack();
        }
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
      showSheet: false
    });
  },

  onSwiperChange(e) {
    this.setData({
      currentIndex: e.detail.current,
      showResult: false
    });
  },

  onSelectOption(e) {
    if (this.data.showResult) {
      return;
    }
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
    this.updateAnsweredCount();
  },

  onBlankInput(e) {
    const { questionId, blankIndex } = e.currentTarget.dataset;
    const value = e.detail.value || '';
    const { userAnswers } = this.data;
    const current = Array.isArray(userAnswers[questionId]) ? userAnswers[questionId] : [];
    current[blankIndex] = value;
    userAnswers[questionId] = current;
    this.setData({ userAnswers });
    this.updateAnsweredCount();
  },

  onTextAnswerInput(e) {
    const { questionId } = e.currentTarget.dataset;
    const value = e.detail.value || '';
    const { userAnswers } = this.data;
    userAnswers[questionId] = value;
    this.setData({ userAnswers });
    this.updateAnsweredCount();
  },

  updateAnsweredCount() {
    const { userAnswers, questions } = this.data;
    const answeredCount = questions.filter(q => {
      const ans = userAnswers[q._id];
      if (q.type === 'BLANK') return Array.isArray(ans) && ans.some(v => v && v.trim());
      if (q.type === 'SHORT' || q.type === 'CALC') return typeof ans === 'string' && ans.trim();
      if (q.type === 'CASE') {
        return Array.isArray(q.children) && q.children.some(c => userAnswers[c._id]);
      }
      return ans && ans.length > 0;
    }).length;

    this.setData({ answeredCount });
  },

  async onSubmitAnswer() {
    const { currentIndex, questions } = this.data;
    const currentQuestion = questions[currentIndex];

    try {
      const res = await api.getQuestionDetail(currentQuestion.examId, currentQuestion._id);
      const questionDetail = normalizeQuestion(res.data);

      questions[currentIndex] = {
        ...currentQuestion,
        ...questionDetail
      };

      this.setData({
        questions,
        showResult: true
      });

      this.calculateScore();
    } catch (error) {
      console.error('[exam] ??????', error);
      util.showError('提交失败');
    }
  },

  calculateScore() {
    const { questions, userAnswers } = this.data;
    let correctCount = 0;

    const checkCorrect = (q) => {
      const userAnswer = userAnswers[q._id];
      if (!userAnswer) return false;

      if (q.type === 'MULTI') {
        const userArr = Array.isArray(userAnswer) ? userAnswer : [userAnswer];
        const correctArr = Array.isArray(q.answer) ? q.answer : [q.answer];
        return JSON.stringify(userArr.sort()) === JSON.stringify(correctArr.sort());
      }
      if (q.type === 'BLANK') {
        if (!Array.isArray(q.answer)) return false;
        const userArr = Array.isArray(userAnswer) ? userAnswer : [userAnswer];
        return JSON.stringify(userArr.map(v => (v || '').trim())) === JSON.stringify(q.answer.map(v => (v || '').trim()));
      }
      if (q.type === 'SHORT' || q.type === 'CALC') {
        return false;
      }
      return userAnswer === q.answer;
    };

    questions.forEach(q => {
      if (q.type === 'CASE') {
        (q.children || []).forEach(c => {
          if (checkCorrect(c)) correctCount++;
        });
      } else {
        if (checkCorrect(q)) correctCount++;
      }
    });

    this.setData({ correctCount });
  },

  onNextQuestion() {
    const { currentIndex, questions } = this.data;
    if (currentIndex < questions.length - 1) {
      this.setData({
        currentIndex: currentIndex + 1,
        showResult: false
      });
    }
  },

  onFinishExam() {
    const { questions, correctCount } = this.data;

    wx.redirectTo({
      url: `/pages/result/result?total=${questions.length}&correct=${correctCount}`
    });
  }
});
