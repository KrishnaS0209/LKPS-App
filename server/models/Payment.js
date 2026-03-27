const { Schema, model } = require('mongoose');

const PaymentSchema = new Schema({
  sessionId: { type: String, required: true, index: true },
  pid:       { type: String, required: true },  // app-level uid
  sid:       { type: String, required: true },  // student sid
  amt:       { type: Number, required: true },
  date:      { type: String },                  // ISO date string
  mode:      { type: String, default: 'Cash' }, // Cash | Online | Cheque
  note:      { type: String, default: '' },
  months:    [String],   // which months this covers
  extras:    [Schema.Types.Mixed],   // extra charges paid
  // frontend display fields
  nm:        { type: String, default: '' },  // student name
  cls:       { type: String, default: '' },  // class
  fee:       { type: Number },               // annual fee
  totalAmt:  { type: Number },
  tuition:   { type: Number },
  md:        { type: String, default: 'Cash' },
  ref:       { type: String, default: '' },
  mn:        { type: String, default: '' },  // month label
  ty:        { type: String, default: '' },  // type
  rc:        { type: String, default: '' },  // receipt number
  bb:        { type: Number },               // balance before
  ba:        { type: Number },               // balance after
}, { timestamps: true });

PaymentSchema.index({ sessionId: 1, pid: 1 }, { unique: true });

module.exports = model('Payment', PaymentSchema);
