import mongoose from 'mongoose';

const appointmentSchema = new mongoose.Schema({
  clinicId: {
    type: String,
    required: true,
    index: true,
  },
  patientName: {
    type: String,
    required: true,
  },
  patientPhone: {
    type: String,
    required: true,
  },
  patientEmail: {
    type: String,
    required: true,
  },
  consultationType: {
    type: String,
    required: true,
  },
  date: {
    type: String, // YYYY-MM-DD
    required: true,
  },
  time: {
    type: String, // HH:MM
    required: true,
  },
  country: {
    type: String,
    default: 'US',
  },
  notes: {
    type: String,
    default: '',
  },
  status: {
    type: String,
    enum: ['Pending', 'Confirmed', 'Cancelled'],
    default: 'Confirmed', // Confirmed by default after booking completes successfully
  },
  paymentStatus: {
    type: String,
    enum: ['Unpaid', 'Paid'],
    default: 'Unpaid',
  },
  paymentProvider: {
    type: String,
    default: 'None', // 'Razorpay', 'Stripe', 'QR'
  },
  paymentDetails: {
    type: Map,
    of: String,
    default: {},
  }
}, { timestamps: true });

const Appointment = mongoose.model('Appointment', appointmentSchema);
export default Appointment;
