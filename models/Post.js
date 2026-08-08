const mongoose = require('mongoose');

const postSchema = new mongoose.Schema(
  {
    itemName: {
      type: String,
      required: [true, 'Please add item name'],
      trim: true,
    },
    isLost: {
      type: Boolean,
      required: true,
      default: true, // true = Lost, false = Found
    },
    category: {
      type: String,
      required: [true, 'Please select a category'],
      enum: [
        'Mobiles',
        'Men Wallets',
        'Women Purse',
        'Suitcase or Bag',
        'Electronics',
        'ID Card',
        'Documents',
        'Cash',
        'Gold and Non-Gold Jewelry',
        'Other',
        'Others',
      ],
      default: 'Others',
    },
    description: {
      type: String,
      default: '',
    },
    date: {
      type: String,
      required: [true, 'Please add date'],
    },
    city: {
      type: String,
      default: '',
    },
    phone: {
      type: String,
      default: '',
    },
    email: {
      type: String,
      default: '',
    },
    locationName: {
      type: String,
      required: [true, 'Please add location name'],
    },
    // GeoJSON Point location for near search queries
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        default: [0, 0],
      },
    },
    images: [
      {
        type: String, // Local image file path or URL
      },
    ],
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    rejectionReason: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

// Create 2dsphere index for location-based searching
postSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Post', postSchema);
