const fs = require('fs');
const path = require('path');
const Post = require('../models/Post');
const User = require('../models/User');
const Notification = require('../models/Notification');

// @desc    Get all pending posts requiring approval
// @route   GET /api/admin/pending-posts
// @access  Private/Admin
exports.getPendingPosts = async (req, res) => {
  try {
    const pendingPosts = await Post.find({ status: 'pending' })
      .populate('userId', 'name email phone photoUrl')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: pendingPosts.length,
      posts: pendingPosts,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all posts (pending, approved, rejected)
// @route   GET /api/admin/posts
// @access  Private/Admin
exports.getAllPosts = async (req, res) => {
  try {
    const posts = await Post.find()
      .populate('userId', 'name email phone photoUrl')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: posts.length,
      posts,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Approve or Reject a Post (Status Update)
// @route   PUT /api/admin/posts/:id/status
// @access  Private/Admin
exports.updatePostStatus = async (req, res) => {
  try {
    const { status, rejectionReason } = req.body;

    if (!status || !['approved', 'rejected', 'pending'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be approved, rejected, or pending.',
      });
    }

    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }

    post.status = status;
    if (status === 'rejected') {
      post.rejectionReason = rejectionReason || 'Violates community guidelines';
    } else {
      post.rejectionReason = '';
    }

    await post.save();

    // Create a real DB notification for the post owner
    try {
      if (post.userId) {
        const title = status === 'approved' ? 'Post Approved! 🎉' : 'Post Status Update';
        const body = status === 'approved'
            ? `Your post "${post.itemName || 'item'}" has been approved and is now live!`
            : `Your post "${post.itemName || 'item'}" was rejected: ${post.rejectionReason}`;
        await Notification.create({
          userId: post.userId,
          title,
          body,
          type: status === 'approved' ? 'post' : 'warning',
          isUnread: true,
        });
      }
    } catch (notifErr) {
      console.error('Failed to create post status notification:', notifErr.message);
    }

    res.status(200).json({
      success: true,
      message: `Post ${status} successfully`,
      post,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


exports.getAdminUsers = async (req, res) => {
  try {
    const users = await User.find({})
      .select('-password')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: users.length,
      users,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


exports.deleteUser = async (req, res) => {
  try {
    const mongoose = require('mongoose');
    const param = (req.params.id || '').trim();

    let user = null;
    if (mongoose.Types.ObjectId.isValid(param)) {
      user = await User.findById(param);
    }
    if (!user) {
      user = await User.findOne({ email: param.toLowerCase() });
    }

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found in MongoDB database' });
    }

    // Find user's posts and delete physical image files from /uploads
    const userPosts = await Post.find({ userId: user._id });
    userPosts.forEach((post) => {
      if (post.images && Array.isArray(post.images) && post.images.length > 0) {
        post.images.forEach((imgUrl) => {
          if (!imgUrl) return;
          const fileName = path.basename(imgUrl);
          const filePath = path.join(__dirname, '../uploads', fileName);
          if (fs.existsSync(filePath)) {
            try {
              fs.unlinkSync(filePath);
            } catch (err) {
              console.error(`Failed to delete file ${filePath}:`, err.message);
            }
          }
        });
      }
    });

    // Delete user's posts from database
    await Post.deleteMany({ userId: user._id });

    // Delete user's notifications from database
    await Notification.deleteMany({ userId: user._id });

    // Hard delete user document permanently from MongoDB
    await User.findByIdAndDelete(user._id);

    res.status(200).json({
      success: true,
      message: 'User and all associated data permanently deleted from MongoDB database by Admin',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
