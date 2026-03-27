const { Schema, model } = require('mongoose');

const MessageSchema = new Schema({
  sessionId:  { type: String, required: true, index: true },
  studentSid: { type: String, required: true },
  studentName:{ type: String },
  cls:        { type: String },
  type:       { type: String, default: 'message' }, // 'message' | 'certificate' | 'request'
  subject:    { type: String, required: true },
  body:       { type: String, default: '' },
  status:     { type: String, default: 'unread' }, // 'unread' | 'read' | 'resolved'
}, { timestamps: true });

module.exports = model('Message', MessageSchema);
