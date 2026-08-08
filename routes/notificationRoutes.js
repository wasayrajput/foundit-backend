const express = require('express');
const router = express.Router();
const {
  getUserNotifications,
  markNotificationsAsRead,
  deleteNotifications,
} = require('../controllers/notificationController');
const { protect } = require('../middlewares/authMiddleware');

router.use(protect);

router.get('/', getUserNotifications);
router.put('/read', markNotificationsAsRead);
router.delete('/', deleteNotifications);

module.exports = router;
