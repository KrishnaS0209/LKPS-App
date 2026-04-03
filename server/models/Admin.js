const { Schema, model } = require('mongoose');
const bcrypt = require('bcryptjs');

const AdminSchema = new Schema({
  username: { type: String, required: true, unique: true, trim: true },
  password: { type: String, required: true },
  name:     { type: String, required: true },
  role:     { type: String, default: 'Admin' },
  photo:    { type: String, default: '' },
  email:    { type: String, default: '' },
  otp:      { type: String, default: '' },
  otpExpiry:{ type: Date,   default: null },
}, { timestamps: true });

// Hash password before save
AdminSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 10);
});

AdminSchema.methods.matchPassword = function (plain) {
  return bcrypt.compare(plain, this.password);
};

module.exports = model('Admin', AdminSchema);
