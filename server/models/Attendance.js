const { Schema, model } = require('mongoose');

// One document per class per date
const AttendanceSchema = new Schema({
  sessionId: { type: String, required: true, index: true },
  date:      { type: String, required: true },  // "YYYY-MM-DD"
  cls:       { type: String, required: true },
  records:   { type: Map, of: String },         // { studentSid: 'P'|'A'|'L' }
}, { timestamps: true });

AttendanceSchema.index({ sessionId: 1, date: 1, cls: 1 }, { unique: true });

module.exports = model('Attendance', AttendanceSchema);
