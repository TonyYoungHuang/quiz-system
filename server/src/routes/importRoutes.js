const express = require('express');
const router = express.Router();
const importController = require('../controllers/importController');

router.post('/admin/import/upload', importController.upload);
router.post('/admin/import/extract', importController.extract);
router.post('/admin/import/parse', importController.parse);
router.post('/admin/import/validate', importController.validate);
router.post('/admin/import/saveDraft', importController.saveDraft);
router.post('/admin/import/export', importController.exportData);
router.post('/admin/import/commit', importController.commit);
router.get('/admin/import/tasks', importController.getTasks);
router.get('/admin/import/tasks/:id', importController.getTask);

module.exports = router;
