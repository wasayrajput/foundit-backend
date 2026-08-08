const fs = require('fs');
const path = require('path');
const Post = require('../models/Post');
const Notification = require('../models/Notification');

// Helper to delete physical image files from uploads folder
const deletePostImages = (images) => {
  if (images && Array.isArray(images) && images.length > 0) {
    images.forEach((imgUrl) => {
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
};


exports.createPost = async (req, res) => {
  try {
    // Block Admin users from creating posts
    if (req.user && req.user.role === 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin accounts are for moderation only and cannot create posts.',
      });
    }
    const {
      itemName,
      isLost,
      category,
      description,
      date,
      city,
      locationName,
      latitude,
      longitude,
      images,
      phone,
      email,
    } = req.body;

    if (!itemName || isLost === undefined || !date || !locationName) {
      return res.status(400).json({ success: false, message: 'Please provide item name, type (lost/found), date, and location' });
    }

    // Build GeoJSON location coordinates if latitude and longitude exist
    const location = {
      type: 'Point',
      coordinates: [
        longitude ? parseFloat(longitude) : 0,
        latitude ? parseFloat(latitude) : 0,
      ],
    };

    const post = await Post.create({
      itemName,
      isLost,
      category: category || 'Others',
      description: description || '',
      date,
      city: city || '',
      locationName,
      location,
      images: images || [],
      phone: phone || (req.user ? req.user.phone : ''),
      email: email || (req.user ? req.user.email : ''),
      userId: req.user.id,
      status: 'pending', // Starts as pending admin approval
    });

    // Create DB notification for user
    try {
      await Notification.create({
        userId: req.user.id,
        title: 'Post Submitted for Review 📝',
        body: `Your ${isLost ? 'lost' : 'found'} post for "${itemName}" has been submitted and is pending admin approval.`,
        type: 'post',
        isUnread: true,
      });
    } catch (notifErr) {
      console.error('Failed to create post notification:', notifErr.message);
    }

    res.status(201).json({
      success: true,
      message: 'Post created successfully and submitted for admin review.',
      post,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all approved posts for Home Feed
// @route   GET /api/posts
// @access  Public
exports.getApprovedPosts = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const startIndex = (page - 1) * limit;

    const query = { status: 'approved' };

    // Filter by Lost / Found tab if specified
    if (req.query.isLost !== undefined) {
      query.isLost = req.query.isLost === 'true';
    }

    const total = await Post.countDocuments(query);
    const posts = await Post.find(query)
      .populate('userId', 'name email phone photoUrl')
      .sort({ createdAt: -1 })
      .skip(startIndex)
      .limit(limit);

    res.status(200).json({
      success: true,
      count: posts.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      posts,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Search and filter posts (by text, category, city, date, type)
// @route   GET /api/posts/search
// @access  Public
exports.searchAndFilterPosts = async (req, res) => {
  try {
    const { q, category, city, isLost, fromDate, toDate } = req.query;

    const query = { status: 'approved' };

    // Text search on item name or description
    if (q && q.trim().length > 0) {
      query.$or = [
        { itemName: { $regex: q.trim(), $options: 'i' } },
        { description: { $regex: q.trim(), $options: 'i' } },
        { locationName: { $regex: q.trim(), $options: 'i' } },
      ];
    }

    if (category && category.trim().length > 0) {
      query.category = { $regex: category.trim(), $options: 'i' };
    }

    if (city && city.trim().length > 0) {
      query.city = { $regex: city.trim(), $options: 'i' };
    }

    if (isLost !== undefined) {
      query.isLost = isLost === 'true';
    }

    const posts = await Post.find(query)
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


exports.getNearbyPosts = async (req, res) => {
  try {
    const { lat, lng, radius, isLost, category } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both latitude (lat) and longitude (lng) coordinates',
      });
    }

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);
    const radiusInKm = parseFloat(radius) || 10.0;
    const maxDistanceMeters = radiusInKm * 1000;

    const query = {
      status: 'approved',
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [longitude, latitude],
          },
          $maxDistance: maxDistanceMeters,
        },
      },
    };

    if (isLost !== undefined) {
      query.isLost = isLost === 'true';
    }

    if (category && category.trim().length > 0) {
      query.category = { $regex: category.trim(), $options: 'i' };
    }

    const posts = await Post.find(query)
      .populate('userId', 'name email phone photoUrl');

    res.status(200).json({
      success: true,
      count: posts.length,
      coordinates: { latitude, longitude },
      radiusInKm,
      maxDistanceMeters,
      posts,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get single post details
// @route   GET /api/posts/:id
// @access  Public
exports.getPostById = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id).populate('userId', 'name email phone photoUrl');

    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }

    res.status(200).json({
      success: true,
      post,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get user's own posts
// @route   GET /api/posts/my-posts
// @access  Private
exports.getMyPosts = async (req, res) => {
  try {
    const posts = await Post.find({ userId: req.user.id })
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

// @desc    Update post (Owner only)
// @route   PUT /api/posts/:id
// @access  Private
exports.updatePost = async (req, res) => {
  try {
    let post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }

    // Verify ownership or admin role
    if (post.userId.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized to update this post' });
    }

    post = await Post.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({
      success: true,
      message: 'Post updated successfully',
      post,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete post (Owner or Admin)
// @route   DELETE /api/posts/:id
// @access  Private
exports.deletePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }

    // Verify ownership or admin role
    if (post.userId.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this post' });
    }

    // Delete physical image files from /uploads folder
    deletePostImages(post.images);

    await post.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Post deleted successfully',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
