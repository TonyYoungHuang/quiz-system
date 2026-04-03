function buildSharePayload(options = {}) {
  const title = options.title || '题库刷题小程序，支持科目激活、专题训练和模拟考试';
  const path = options.path || '/pages/index/index';

  return {
    title,
    path
  };
}

module.exports = {
  buildSharePayload
};
