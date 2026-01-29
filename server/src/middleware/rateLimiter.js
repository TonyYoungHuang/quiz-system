const rateLimit = require('express-rate-limit');

/**
 * API 限流中间件
 * 防止恶意请求和接口滥用
 */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 分钟
  max: 100, // 每个 IP 最多 100 次请求
  message: {
    success: false,
    message: '请求过于频繁，请稍后再试'
  },
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * 激活码接口限流（更严格）
 */
const activateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 小时
  max: 10, // 每个 IP 最多 10 次激活尝试
  message: {
    success: false,
    message: '激活尝试次数过多，请稍后再试'
  }
});

module.exports = {
  apiLimiter,
  activateLimiter
};
