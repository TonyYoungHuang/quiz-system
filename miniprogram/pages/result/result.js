// pages/result/result.js
Page({
  data: {
    total: 0,
    correct: 0,
    wrong: 0,
    score: 0,
    accuracy: 0,
    commentEmoji: '',
    commentText: ''
  },

  onLoad(options) {
    const total = parseInt(options.total) || 0;
    const correct = parseInt(options.correct) || 0;
    const wrong = total - correct;
    const score = total ? Math.round((correct / total) * 100) : 0;
    const accuracy = score;

    this.setData({
      total,
      correct,
      wrong,
      score,
      accuracy,
      ...this.getComment(score)
    });
  },

  getComment(score) {
    if (score === 100) {
      return { commentEmoji: '??', commentText: '????????' };
    } else if (score >= 80) {
      return { commentEmoji: '??', commentText: '??????????' };
    } else if (score >= 60) {
      return { commentEmoji: '??', commentText: '?????????' };
    }
    return { commentEmoji: '??', commentText: '??????????' };
  },

  onBackHome() {
    wx.switchTab({ url: '/pages/index/index' });
  },

  onRetry() {
    wx.navigateBack();
  }
});
