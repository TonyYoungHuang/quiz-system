const express = require('express');
const router = express.Router();
const activationController = require('../controllers/activationController');

// 用户接口
router.post('/activate', activationController.activateCode);
router.get('/permissions/:userId', activationController.getUserPermissions);
router.get('/permissions/check', activationController.checkPermission);

// 管理员接口 - 统计
router.get('/codes/count', activationController.getCodesCount);
router.get('/permissions/count', activationController.getPermissionsCount);

// 管理员接口 - 激活码管理
router.post('/admin/codes/generate', activationController.generateCodes);
router.get('/admin/codes', activationController.getCodes);
router.delete('/admin/codes/:id', activationController.deleteCode);

module.exports = router;
