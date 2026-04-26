Page({
  data: {
    total: 0,
    answered: 0,
    correct: 0,
    wrong: 0,
    remaining: 0,
    score: 0,
    accuracy: 0,
    commentEmoji: '',
    commentText: '',
    examId: '',
    title: '',
    topicId: '',
    paperId: '',
    mode: 'regular',
    resumeAvailable: false,
    retryText: '',
    ui: {
      title: '本次成绩',
      scoreLabel: '得分',
      totalLabel: '题目总量',
      answeredLabel: '已作答',
      correctLabel: '答对',
      wrongLabel: '答错',
      remainingLabel: '未完成',
      accuracyLabel: '正确率',
      backHome: '返回首页',
      retry: '继续练习',
      retryResume: '继续做题',
      retryWrong: '继续错题复习',
      retryFavorite: '继续收藏复习'
    }
  },

  onLoad(options) {
    const total = parseInt(options.total, 10) || 0;
    const answered = parseInt(options.answered, 10) || 0;
    const correct = parseInt(options.correct, 10) || 0;
    const remaining = parseInt(options.remaining, 10) || Math.max(total - answered, 0);
    const wrong = Math.max(answered - correct, 0);
    const score = answered ? Math.round((correct / answered) * 100) : 0;
    const accuracy = score;
    const title = options.title ? decodeURIComponent(options.title) : '';
    const mode = options.mode || 'regular';
    const resumeAvailable = String(options.resume || '') === '1';

    this.setData({
      total,
      answered,
      correct,
      wrong,
      remaining,
      score,
      accuracy,
      examId: options.examId || '',
      title,
      topicId: options.topicId || '',
      paperId: options.paperId || '',
      mode,
      resumeAvailable,
      retryText: this.getRetryText(mode, resumeAvailable),
      ...this.getComment(score, answered, remaining)
    });
  },

  getComment(score, answered, remaining) {
    if (!answered) {
      return { commentEmoji: '🙂', commentText: '这次还没有正式提交答案，可以继续完成当前练习。' };
    }
    if (remaining > 0) {
      return { commentEmoji: '📝', commentText: '本次成绩按当前已作答内容结算，剩余题目下次还可以继续。' };
    }
    if (score === 100) {
      return { commentEmoji: '🏆', commentText: '满分表现，继续保持现在的状态。' };
    }
    if (score >= 80) {
      return { commentEmoji: '😄', commentText: '整体发挥不错，再刷一轮会更稳。' };
    }
    if (score >= 60) {
      return { commentEmoji: '🙂', commentText: '已经及格，建议优先回顾这次错题。' };
    }
    return { commentEmoji: '💪', commentText: '建议先回顾错题，再继续刷新题巩固。' };
  },

  getRetryText(mode, resumeAvailable) {
    if (mode === 'wrong') return this.data.ui.retryWrong;
    if (mode === 'favorite') return this.data.ui.retryFavorite;
    if (resumeAvailable) return this.data.ui.retryResume;
    return this.data.ui.retry;
  },

  onBackHome() {
    wx.switchTab({ url: '/pages/index/index' });
  },

  onRetry() {
    const query = [
      `examId=${encodeURIComponent(this.data.examId || '')}`,
      `title=${encodeURIComponent(this.data.title || '')}`
    ];
    if (this.data.topicId) query.push(`topicId=${encodeURIComponent(this.data.topicId)}`);
    if (this.data.paperId) query.push(`paperId=${encodeURIComponent(this.data.paperId)}`);
    if (this.data.mode === 'wrong') query.push('mode=wrong');
    if (this.data.mode === 'favorite') query.push('mode=favorite');

    wx.redirectTo({
      url: `/pages/exam/exam?${query.join('&')}`
    });
  },

  onShareAppMessage() {
    const examTitle = this.data.title || '??';
    return {
      title: `我刚完成《${examTitle}》的一轮练习，一起来刷题吧`,
      path: '/pages/index/index'
    };
  },

  onShareTimeline() {
    const examTitle = this.data.title || '??';
    return {
      title: `我刚完成《${examTitle}》的一轮练习`
    };
  }
});
