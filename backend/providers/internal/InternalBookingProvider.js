import BookingProvider from '../base/BookingProvider.js';
import Appointment from '../../models/Appointment.js';
import Clinic from '../../models/Clinic.js';

export default class InternalBookingProvider extends BookingProvider {
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
      
      // Enforce duplicate check
      const isDuplicate = await Appointment.findOne({
        clinicId,
        date,
        time,
        status: { $ne: 'Cancelled' }
      });
      if (isDuplicate) {
        return {
          success: false,
          message: 'This time slot is already booked. Please select another slot.'
        };
      }

      // Enforce daily limit of 10 appointments
      const dailyCount = await Appointment.countDocuments({
        clinicId,
        date,
        status: { $ne: 'Cancelled' }
      });
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

      const bookedTimes = bookedAppointments.map(app => app.time);
      return totalSlots.filter(slot => !bookedTimes.includes(slot));
    } catch (error) {
      console.error('Error fetching internal slots:', error);
      return [];
    }
  }
}
