const { Schema, model } = require('mongoose');

const StudentSchema = new Schema({
  sessionId: { type: String, required: true, index: true },
  sid:       { type: String, required: true },
  fn:        String,
  ln:        String,
  roll:      String,
  admno:     String,
  cls:       String,
  dob:       String,
  gn:        { type: String, enum: ['Male', 'Female', 'Other'] },
  blood:     String,
  father:    String,
  mother:    String,
  fphone:    String,
  mphone:    String,
  ph:        String,   // student phone
  addr:      String,   // address
  city:      String,
  caste:     String,
  aadhar:    String,
  fee:       { type: Number, default: 0 },
  mf:        { type: Number, default: 0 },   // monthly fee
  fextras:   { type: Array,  default: [] },  // extra fee items
  fst:       { type: String, default: 'Pending' },
  photo:     { type: String, default: '' },
  puser:     String,   // parent portal username
  ppass:     String,   // parent portal password
  // marksheet data saved from guest student generator
  _rcMarks:      { type: Schema.Types.Mixed, default: null },
  _rcSubjects:   { type: String, default: '' },
  _rcCoGrades:   { type: Schema.Types.Mixed, default: null },
  _rcDiscGrades: { type: Schema.Types.Mixed, default: null },
  _rcAttP:       { type: Number, default: 0 },
  _rcAttT:       { type: Number, default: 0 },
  _rcRank:       { type: Number, default: 0 },
}, { timestamps: true, strict: false });

StudentSchema.index({ sessionId: 1, sid: 1 }, { unique: true });

module.exports = model('Student', StudentSchema);
