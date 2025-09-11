// /server/routes/notification.routes.js
const express = require('express');
const router = express.Router();
const { getNotifications } = require('../controllers/notification.controller.js');
const { protect } = require('../middleware/protect.js');

// This single route handles fetching notifications.
// It's protected, so only a logged-in user can access it.
router.route('/').get(protect, getNotifications);

module.exports = router;