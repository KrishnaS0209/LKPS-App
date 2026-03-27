const { Schema, model } = require('mongoose');

const SessionSchema = new Schema({
  sid:     { type: String, required: true, unique: true }, // e.g. "sess_default"
  name:    { type: String, required: true },               // e.g. "2025-2026"
  year:    { type: String, required: true },
  created: { type: Date, default: Date.now },
});

module.exports = model('Session', SessionSchema);
