const mongoose = require('mongoose');

const userWarningSchema = new mongoose.Schema(
  {
    targetUserEmail: {
      type: String,
      required: true,
      lowercase: true,
    },
    postId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Post',
    },
    postName: {
      type: String,
      default: '',
    },
    subject: {
      type: String,
      required: true,
    },
    explanation: {
      type: String,
      required: true,
    },
    issuedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('UserWarning', userWarningSchema);
