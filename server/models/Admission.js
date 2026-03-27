const { Schema, model } = require('mongoose');

const AdmissionSchema = new Schema({
  name:  { type: String, required: true },
  phone: { type: String, required: true },
  email: { type: String, default: '' },
  status: { type: String, enum: ['Pending', 'Contacted', 'Enrolled', 'Rejected'], default: 'Pending' },
  note:  { type: String, default: '' },
}, { timestamps: true });

module.exports = model('Admission', AdmissionSchema);
