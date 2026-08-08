const fs = require('fs');
const path = require('path');
const User = require('../models/User');
const Post = require('../models/Post');
const Notification = require('../models/Notification');

// @desc    Get Current Logged-in User Profile
// @route   GET /api/users/profile
// @access  Private
exports.getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update User Profile (Name, Email, Phone, Photo)
// @route   PUT /api/users/profile
// @access  Private
exports.updateUserProfile = async (req, res) => {
  try {
    const { name, email, phone, photoUrl } = req.body;

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (name && name.trim().length > 0) {
      user.name = name.trim();
    }
    if (email && email.trim().length > 0) {
      const cleanEmail = email.toLowerCase().trim();
      const existingUser = await User.findOne({ email: cleanEmail, _id: { $ne: user._id } });
      if (existingUser) {
        return res.status(400).json({ success: false, message: 'This email is already in use by another account.' });
      }
      user.email = cleanEmail;
    }
    if (phone !== undefined) {
      user.phone = phone.trim();
    }
    if (photoUrl !== undefined) {
      user.photoUrl = photoUrl.trim();
    }

    await user.save();

    // Update phone & email on all user's posts in MongoDB
    const postUpdates = {};
    if (phone !== undefined) postUpdates.phone = user.phone;
    if (email && email.trim().length > 0) postUpdates.email = user.email;
    if (Object.keys(postUpdates).length > 0) {
      await Post.updateMany({ userId: user._id }, postUpdates);
    }

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully in database',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        photoUrl: user.photoUrl,
        role: user.role,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get Me (Current User details with populated saved posts)
// @route   GET /api/users/me
// @access  Private
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select('-password')
      .populate('savedPosts');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get User's Saved / Bookmarked Posts
// @route   GET /api/users/saved
// @access  Private
exports.getSavedPosts = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate({
      path: 'savedPosts',
      populate: { path: 'userId', select: 'name email phone photoUrl' },
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.status(200).json({
      success: true,
      count: user.savedPosts ? user.savedPosts.length : 0,
      savedPosts: user.savedPosts || [],
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


exports.toggleSavePost = async (req, res) => {
  try {
    const { postId } = req.params;

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (!user.savedPosts) {
      user.savedPosts = [];
    }

    const postIndex = user.savedPosts.findIndex(
      (id) => id.toString() === postId.toString()
    );

    let isSaved = false;
    if (postIndex > -1) {
      // Unsave post
      user.savedPosts.splice(postIndex, 1);
      isSaved = false;
    } else {
      // Save post
      user.savedPosts.push(postId);
      isSaved = true;
    }

    await user.save();

    res.status(200).json({
      success: true,
      isSaved,
      message: isSaved ? 'Post bookmarked' : 'Post removed from bookmarks',
      savedPosts: user.savedPosts,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


exports.deleteMyAccount = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Delete user's post images from /uploads folder
    const userPosts = await Post.find({ userId });
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


    await Post.deleteMany({ userId });

    await Notification.deleteMany({ userId });

    // Hard delete user document permanently from MongoDB database
    await User.findByIdAndDelete(userId);

    res.status(200).json({
      success: true,
      message: 'User account and all associated data permanently deleted from database.',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
