const express = require('express');
const router = express.Router();
const topicController = require('../controllers/topicController');

// public topics
router.get('/topics', topicController.getTopics);

router.get('/admin/topics', topicController.getTopics);
router.post('/admin/topics', topicController.createTopic);
router.put('/admin/topics/:id', topicController.updateTopic);
router.delete('/admin/topics/:id', topicController.deleteTopic);
router.post('/admin/topics/:id/bind', topicController.bindQuestions);
router.post('/admin/topics/:id/unbind', topicController.unbindQuestions);

module.exports = router;
