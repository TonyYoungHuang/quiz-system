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
    const score = Math.round((correct / total) * 100);
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

  /**
   * 根据分数获取评价
   */
  getComment(score) {
    if (score === 100) {
      return {
        commentEmoji: '🎉',
        commentText: '太棒了！全部正确，继续保持！'
      };
    } else if (score >= 80) {
      return {
        commentEmoji: '😊',
        commentText: '表现不错！继续努力，争取满分！'
      };
    } else if (score >= 60) {
      return {
        commentEmoji: '💪',
        commentText: '及格了！还有进步空间，加油！'
      };
    } else {
      return {
        commentEmoji: '📚',
        commentText: '需要加强练习，相信自己能行！'
      };
    }
  },

  /**
   * 返回首页
   */
  onBackHome() {
    wx.switchTab({
      url: '/pages/index/index'
    });
  },

  /**
   * 再练一次
   */
  onRetry() {
    wx.navigateBack();
  }
});
