import BookingProvider from '../base/BookingProvider.js';
import Appointment from '../../models/Appointment.js';
import Clinic from '../../models/Clinic.js';

export default class InternalBookingProvider extends BookingProvider {
  normalizeTime(timeStr) {
    if (!timeStr) return '';
    const clean = timeStr.trim().toLowerCase().replace(/\s+/g, '');
    const match = clean.match(/^(\d{1,2}):?(\d{2})?(am|pm)?$/);
    if (!match) return clean;
    let hours = parseInt(match[1], 10);
    const minutes = match[2] || '00';
    const period = match[3];
    if (period === 'pm' && hours < 12) hours += 12;
    if (period === 'am' && hours === 12) hours = 0;
    return `${String(hours).padStart(2, '0')}:${minutes}`;
  }

  async bookAppointment({
    clinicId,
    patientName,
    patientPhone,
    patientEmail,
    consultationType,
    date,
    time,
    country,
    notes,
    paymentProvider,
    paymentStatus
  }) {
    try {
      const isPaid = paymentProvider === 'Razorpay' || paymentProvider === 'Stripe' || paymentProvider === 'Paid' || paymentStatus === 'Paid';
      
      const targetTimeNorm = this.normalizeTime(time);
      const existingAppointments = await Appointment.find({
        clinicId,
        date,
        status: { $ne: 'Cancelled' }
      }).select('time');

      const isDuplicate = existingAppointments.some(app => this.normalizeTime(app.time) === targetTimeNorm);
      if (isDuplicate) {
        return {
          success: false,
          message: `The time slot (${time}) is already booked for this date. Please select another slot.`
        };
      }

      // Enforce daily limit of 10 appointments
      const dailyCount = existingAppointments.length;
      if (dailyCount >= 10) {
        return {
          success: false,
          message: 'This date has reached the maximum daily limit of 10 appointments. Please choose another date.'
        };
      }

      const appointment = await Appointment.create({
        clinicId,
        patientName,
        patientPhone,
        patientEmail,
        consultationType,
        date,
        time,
        country: country || 'US',
        notes: notes || 'Routine follow-up scheduled. Take daily multivitamin, drink water, check blood pressure.',
        status: 'Confirmed',
        paymentStatus: isPaid ? 'Paid' : 'Unpaid',
        paymentProvider: paymentProvider || 'None'
      });

      return {
        success: true,
        message: 'Appointment booked successfully via internal SaaS.',
        appointment
      };
    } catch (error) {
      return {
        success: false,
        message: error.message
      };
    }
  }

  async getAvailableSlots(clinicId, date) {
    try {
      const clinic = await Clinic.findOne({ clinicId });
      if (!clinic) return [];

      const totalSlots = clinic.appointmentSlots || [];
      
      // Filter out slots that are already booked for this clinic on this date
      const bookedAppointments = await Appointment.find({
        clinicId,
        date,
        status: { $ne: 'Cancelled' }
      }).select('time');

      const bookedNormalized = bookedAppointments.map(app => this.normalizeTime(app.time));
      return totalSlots.filter(slot => !bookedNormalized.includes(this.normalizeTime(slot)));
    } catch (error) {
      console.error('Error fetching internal slots:', error);
      return [];
    }
  }
}
