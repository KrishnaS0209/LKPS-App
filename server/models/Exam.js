const { Schema, model } = require('mongoose');

const ExamSchema = new Schema({
  sessionId: { type: String, required: true, index: true },
  eid:       { type: String, required: true },
  name:      String,   // e.g. "Unit Test 1"
  cls:       String,
  subject:   String,
  date:      String,   // "YYYY-MM-DD"
  maxMarks:  { type: Number, default: 100 },
  // marks: { studentSid: marksObtained }
  marks:     { type: Map, of: Number },
}, { timestamps: true });

ExamSchema.index({ sessionId: 1, eid: 1 }, { unique: true });

module.exports = model('Exam', ExamSchema);
