const express = require('express');
const router = express.Router();
const examController = require('../controllers/examController');

// 统计接口（必须在 :id 路由之前）
router.get('/count/stats', examController.getExamsCount);

// 公开接口
router.get('/', examController.getExams);
router.get('/:id', examController.getExamById);

// 管理员接口
router.post('/admin', examController.createExam);
router.put('/admin/:id', examController.updateExam);
router.delete('/admin/:id', examController.deleteExam);
router.patch('/admin/:id/toggle', examController.toggleExamStatus);

module.exports = router;
