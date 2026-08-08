const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    body: {
      type: String,
      required: true,
    },
    iconName: {
      type: String,
      default: 'info',
    },
    colorHex: {
      type: String,
      default: '#10B981',
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('AuditLog', auditLogSchema);
