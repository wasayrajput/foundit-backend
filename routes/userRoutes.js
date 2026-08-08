const express = require('express');
const {
  getUserProfile,
  updateUserProfile,
  deleteMyAccount,
  getMe,
  getSavedPosts,
  toggleSavePost,
} = require('../controllers/userController');
const { protect } = require('../middlewares/authMiddleware');

const router = express.Router();

router.get('/profile', protect, getUserProfile);
router.put('/profile', protect, updateUserProfile);
router.delete('/profile', protect, deleteMyAccount);
router.get('/me', protect, getMe);
router.get('/saved', protect, getSavedPosts);
router.post('/saved/:postId', protect, toggleSavePost);

module.exports = router;
