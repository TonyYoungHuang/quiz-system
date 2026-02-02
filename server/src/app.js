require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const connectDB = require('./config/database');
const errorHandler = require('./middleware/errorHandler');
const { apiLimiter, activateLimiter } = require('./middleware/rateLimiter');

const examRoutes = require('./routes/examRoutes');
const questionRoutes = require('./routes/questionRoutes');
const activationRoutes = require('./routes/activationRoutes');
const topicRoutes = require('./routes/topicRoutes');
const paperRoutes = require('./routes/paperRoutes');
const importRoutes = require('./routes/importRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmet());

app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? ['https://yourdomain.com']
    : '*',
  credentials: true
}));

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

app.use('/admin', express.static('admin'));

if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
  });
}

app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Quiz System API is running',
    timestamp: new Date().toISOString()
  });
});

const API_V1 = '/api/v1';

app.use(`${API_V1}/exams`, apiLimiter, examRoutes);
app.use(`${API_V1}/questions`, apiLimiter, questionRoutes);
app.use(`${API_V1}`, apiLimiter, topicRoutes);
app.use(`${API_V1}`, apiLimiter, paperRoutes);
app.use(`${API_V1}`, apiLimiter, importRoutes);

app.use(`${API_V1}`, (req, res, next) => {
  if (req.path === '/activate') {
    return activateLimiter(req, res, next);
  }
  return apiLimiter(req, res, next);
}, activationRoutes);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Resource not found'
  });
});

app.use(errorHandler);

const startServer = async () => {
  try {
    await connectDB();

    app.listen(PORT, () => {
      console.log(`\nServer started on port ${PORT} (${process.env.NODE_ENV || 'development'})\n`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

module.exports = app;
