// pages/exam/exam.js
const api = require('../../utils/api');
const util = require('../../utils/util');

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

  /**
   * 加载题目
   */
  async loadQuestions() {
    util.showLoading('加载题目中...');

    try {
      const res = await api.getQuestions(this.data.examId);

      // 添加题型信息，并转换 options 格式
      const questions = res.data.map(q => {
        // 将 options 对象转换为数组
        // 从 {"A": "选项A", "B": "选项B"} 转换为 [{key: "A", value: "选项A"}, {key: "B", value: "选项B"}]
        let optionsArray = [];
        if (q.options && typeof q.options === 'object') {
          if (Array.isArray(q.options)) {
            // 已经是数组格式，直接使用
            optionsArray = q.options;
          } else {
            // 是对象格式，需要转换
            optionsArray = Object.keys(q.options).map(key => ({
              key: key,
              value: q.options[key]
            }));
          }
        }

        return {
          ...q,
          options: optionsArray,
          typeName: util.getQuestionTypeName(q.type),
          typeColor: util.getQuestionTypeColor(q.type)
        };
      });

      console.log('[exam] 转换后的题目:', questions);

      this.setData({ questions });
      util.hideLoading();
    } catch (error) {
      console.error('[exam] 加载题目失败:', error);
      util.hideLoading();
      util.showError('加载题目失败');
    }
  },

  /**
   * 返回
   */
  onBack() {
    wx.showModal({
      title: '提示',
      content: '确定要退出答题吗？',
      success: (res) => {
        if (res.confirm) {
          wx.navigateBack();
        }
      }
    });
  },

  /**
   * 显示答题卡
   */
  onShowAnswerSheet() {
    this.setData({ showSheet: true });
  },

  /**
   * 隐藏答题卡
   */
  onHideAnswerSheet() {
    this.setData({ showSheet: false });
  },

  /**
   * 阻止冒泡
   */
  onStopPropagation() {},

  /**
   * 跳转到指定题目
   */
  onJumpToQuestion(e) {
    const index = e.currentTarget.dataset.index;
    this.setData({
      currentIndex: index,
      showSheet: false
    });
  },

  /**
   * Swiper 变化
   */
  onSwiperChange(e) {
    this.setData({
      currentIndex: e.detail.current,
      showResult: false
    });
  },

  /**
   * 选择选项
   */
  onSelectOption(e) {
    console.log('[exam] onSelectOption 触发');
    const { questionId, option } = e.currentTarget.dataset;
    console.log('[exam] questionId:', questionId, 'option:', option);
    const { questions, userAnswers } = this.data;

    // 找到当前题目
    const question = questions.find(q => q._id === questionId);
    console.log('[exam] 当前题目:', question);
    console.log('[exam] 题目类型:', question.type);

    if (question.type === 'MULTI') {
      // 多选
      console.log('[exam] 处理多选题');
      let answers = userAnswers[questionId] || [];
      console.log('[exam] 当前答案:', answers);
      if (answers.includes(option)) {
        answers = answers.filter(a => a !== option);
        console.log('[exam] 取消选择:', option);
      } else {
        answers = [...answers, option];
        console.log('[exam] 添加选择:', option);
      }
      answers.sort(); // 保持答案有序
      userAnswers[questionId] = answers;
      console.log('[exam] 更新后答案:', userAnswers[questionId]);
    } else {
      // 单选/判断
      console.log('[exam] 处理单选/判断题');
      userAnswers[questionId] = option;
      console.log('[exam] 设置答案:', option);
    }

    console.log('[exam] setData userAnswers:', userAnswers);
    this.setData({ userAnswers });
    this.updateAnsweredCount();
  },

  /**
   * 更新已答题数
   */
  updateAnsweredCount() {
    const { userAnswers, questions } = this.data;
    const answeredCount = Object.keys(userAnswers).filter(
      key => userAnswers[key] && userAnswers[key].length > 0
    ).length;

    this.setData({ answeredCount });
  },

  /**
   * 提交答案
   */
  async onSubmitAnswer() {
    const { currentIndex, questions } = this.data;
    const currentQuestion = questions[currentIndex];

    // 先获取当前题目的答案和解析
    try {
      const res = await api.getQuestionDetail(currentQuestion.examId, currentQuestion._id);
      const questionDetail = res.data;

      // 更新当前题目的答案和解析
      questions[currentIndex] = {
        ...currentQuestion,
        answer: questionDetail.answer,
        explanation: questionDetail.explanation
      };

      this.setData({
        questions,
        showResult: true
      });

      this.calculateScore();
    } catch (error) {
      console.error('[exam] 获取答案详情失败:', error);
      util.showError('获取答案失败');
    }
  },

  /**
   * 计算得分
   */
  calculateScore() {
    const { questions, userAnswers } = this.data;
    let correctCount = 0;

    questions.forEach(q => {
      const userAnswer = userAnswers[q._id];
      if (!userAnswer) return;

      if (q.type === 'MULTI') {
        // 多选：完全正确才算对
        // 确保 userAnswer 和 q.answer 都是数组
        const userArr = Array.isArray(userAnswer) ? userAnswer : [userAnswer];
        const correctArr = Array.isArray(q.answer) ? q.answer : [q.answer];
        const correct = JSON.stringify(userArr.sort()) === JSON.stringify(correctArr.sort());
        if (correct) correctCount++;
      } else {
        // 单选/判断
        if (userAnswer === q.answer) correctCount++;
      }
    });

    this.setData({ correctCount });
  },

  /**
   * 下一题
   */
  onNextQuestion() {
    const { currentIndex, questions } = this.data;
    if (currentIndex < questions.length - 1) {
      this.setData({
        currentIndex: currentIndex + 1,
        showResult: false
      });
    }
  },

  /**
   * 完成答题
   */
  onFinishExam() {
    const { questions, correctCount } = this.data;

    wx.redirectTo({
      url: `/pages/result/result?total=${questions.length}&correct=${correctCount}`
    });
  }
});
