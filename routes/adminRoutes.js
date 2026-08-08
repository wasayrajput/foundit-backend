const express = require('express');
const {
  getPendingPosts,
  getAllPosts,
  updatePostStatus,
  getAdminUsers,
  deleteUser,
} = require('../controllers/adminController');
const { protect, adminOnly } = require('../middlewares/authMiddleware');

const router = express.Router();

// Apply protect & adminOnly middleware to all admin routes
router.use(protect);
router.use(adminOnly);

router.get('/pending-posts', getPendingPosts);
router.get('/posts', getAllPosts);
router.put('/posts/:id/status', updatePostStatus);

router.get('/users', getAdminUsers);
router.delete('/users/:id', deleteUser);

module.exports = router;
