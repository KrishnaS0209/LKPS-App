const { Schema, model } = require('mongoose');

// Stores session-level config: classes, timetable, slots, fee structure, settings, events
const SessionDataSchema = new Schema({
  sessionId: { type: String, required: true, unique: true },
  settings: {
    school: { type: String, default: 'LORD KRISHNA PUBLIC SCHOOL' },
    year:   String,
    prin:   String,
    phone:  { type: String, default: '9997360040, 8650616990' },
    addr:   { type: String, default: 'Ishapur, Laxminagar, Mathura' },
    reportAcademicYear: String,
    classFees: { type: Schema.Types.Mixed, default: {} },
  },
  classes: [{ type: Schema.Types.Mixed }],
  tt:      [{ type: Schema.Types.Mixed }],
  slots:   [{ type: Schema.Types.Mixed }],
  fstr: {
    months: [{ type: Schema.Types.Mixed }],
    extras: [{ type: Schema.Types.Mixed }],
  },
  events:  [{ type: Schema.Types.Mixed }],
}, { timestamps: true });

module.exports = model('SessionData', SessionDataSchema);
