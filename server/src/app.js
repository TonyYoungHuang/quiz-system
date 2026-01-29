require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const connectDB = require('./config/database');
const errorHandler = require('./middleware/errorHandler');
const { apiLimiter, activateLimiter } = require('./middleware/rateLimiter');

// 路由导入
const examRoutes = require('./routes/examRoutes');
const questionRoutes = require('./routes/questionRoutes');
const activationRoutes = require('./routes/activationRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// ==================== 中间件配置 ====================

// 安全头
app.use(helmet());

// 跨域配置（生产环境应限制具体域名）
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? ['https://yourdomain.com']
    : '*',
  credentials: true
}));

// 解析 JSON 请求体
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// 静态文件服务（管理后台）
app.use('/admin', express.static('admin'));

// 请求日志
if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
  });
}

// ==================== 路由配置 ====================

// 健康检查接口
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Quiz System API is running',
    timestamp: new Date().toISOString()
  });
});

// API 版本 v1
const API_V1 = '/api/v1';

// 科目相关路由
app.use(`${API_V1}/exams`, apiLimiter, examRoutes);

// 题目相关路由
app.use(`${API_V1}/questions`, apiLimiter, questionRoutes);

// 激活码和权限相关路由（激活接口使用更严格的限流）
app.use(`${API_V1}`, (req, res, next) => {
  if (req.path === '/activate') {
    return activateLimiter(req, res, next);
  }
  return apiLimiter(req, res, next);
}, activationRoutes);

// ==================== 错误处理 ====================

// 404 处理
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: '请求的资源不存在'
  });
});

// 全局错误处理
app.use(errorHandler);

// ==================== 服务器启动 ====================

// 连接数据库后启动服务器
const startServer = async () => {
  try {
    await connectDB();

    app.listen(PORT, () => {
      console.log(`
╔══════════════════════════════════════════╗
║   Quiz System Server Started Successfully  ║
╠══════════════════════════════════════════╣
║  Port: ${PORT}                                ║
║  Environment: ${process.env.NODE_ENV || 'development'}                      ║
║  Time: ${new Date().toLocaleString('zh-CN')}           ║
╚══════════════════════════════════════════╝

📡 API Endpoints:
   GET    ${API_V1}/exams           - 获取科目列表
   POST   ${API_V1}/activate        - 激活码核销
   GET    ${API_V1}/questions/:id   - 获取题目列表
      `);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

// 启动服务器
startServer();

// 优雅关闭
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

module.exports = app;
