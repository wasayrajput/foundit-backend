const express = require('express');
const {
  createPost,
  getApprovedPosts,
  searchAndFilterPosts,
  getNearbyPosts,
  getPostById,
  getMyPosts,
  updatePost,
  deletePost,
} = require('../controllers/postController');
const { protect } = require('../middlewares/authMiddleware');

const router = express.Router();

router.get('/', getApprovedPosts);
router.get('/search', searchAndFilterPosts);
router.get('/nearby', getNearbyPosts);
router.get('/my-posts', protect, getMyPosts);
router.get('/:id', getPostById);

router.post('/', protect, createPost);
router.put('/:id', protect, updatePost);
router.delete('/:id', protect, deletePost);

module.exports = router;
