const express = require('express');
const router = express.Router();
const paperController = require('../controllers/paperController');

// public papers
router.get('/papers', paperController.getPapers);

router.get('/admin/papers', paperController.getPapers);
router.post('/admin/papers', paperController.createPaper);
router.put('/admin/papers/:id', paperController.updatePaper);
router.delete('/admin/papers/:id', paperController.deletePaper);
router.post('/admin/papers/:id/bind', paperController.bindQuestions);
router.post('/admin/papers/:id/unbind', paperController.unbindQuestions);

module.exports = router;
