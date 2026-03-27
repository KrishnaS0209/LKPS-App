const mongoose = require('mongoose');

const noticeSchema = new mongoose.Schema({
  title:    { type: String, required: true, trim: true },
  body:     { type: String, default: '', trim: true },
  tag:      { type: String, enum: ['Event', 'Important', 'Holiday', 'Admission', 'General'], default: 'General' },
  pinned:   { type: Boolean, default: false },
  active:   { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('Notice', noticeSchema);
