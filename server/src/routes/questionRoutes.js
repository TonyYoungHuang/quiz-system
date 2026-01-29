const express = require('express');
const router = express.Router();
const questionController = require('../controllers/questionController');

// 管理员接口（必须在参数路由之前，否则会被匹配）
router.get('/admin/count', questionController.getQuestionsCount);
router.get('/admin', questionController.getAllQuestions);
router.post('/admin', questionController.createQuestion);
router.post('/admin/import', questionController.importQuestions);
router.put('/admin/:id', questionController.updateQuestion);
router.delete('/admin/:id', questionController.deleteQuestion);

// 公开接口（需要权限验证）
router.get('/:examId', questionController.getQuestions);
router.get('/:examId/:questionId', questionController.getQuestionDetail);

module.exports = router;
