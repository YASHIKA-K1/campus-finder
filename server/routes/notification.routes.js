const express = require('express');
const router = express.Router();
const { getNotifications } = require('../controllers/notification.controller.js');
const { protect } = require('../middleware/protect.js');

router.route('/').get(protect, getNotifications);

module.exports = router;