const { Schema, model } = require('mongoose');

const TeacherSchema = new Schema({
  sessionId: { type: String, required: true, index: true },
  tid:       { type: String, required: true },
  fn:        String,
  ln:        String,
  su:        String,
  cls:       String,
  qual:      String,
  ph:        String,
  em:        String,
  empId:     String,
  sal:       { type: Number, default: 0 },
  doj:       String,   // date of joining
  blood:     String,   // blood group
  status:    { type: String, default: 'Active' },
  puser:     String,
  ppass:     String,
  photo:     { type: String, default: '' },
}, { timestamps: true });

TeacherSchema.index({ sessionId: 1, tid: 1 }, { unique: true });

module.exports = model('Teacher', TeacherSchema);
