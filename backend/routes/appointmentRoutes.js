import express from 'express';
import Appointment from '../models/Appointment.js';
import Clinic from '../models/Clinic.js';
import { protect } from '../middleware/authMiddleware.js';
import ProviderRegistry from '../providers/ProviderRegistry.js';

const router = express.Router();

// @desc    Book a new appointment (Public endpoint for chatbot)
// @route   POST /api/appointments/book
// @access  Public
router.post('/book', async (req, res) => {
  const {
    clinicId,
    patientName,
    patientPhone,
    patientEmail,
    consultationType,
    date,
    time,
    country,
    notes,
    paymentProvider
  } = req.body;

  if (!clinicId || !patientName || !patientPhone || !patientEmail || !consultationType || !date || !time) {
    return res.status(400).json({ success: false, message: 'All booking parameters are required.' });
  }

  try {
    const registry = await ProviderRegistry.resolveClinicProviders(clinicId);
    
    // 1. Resolve Patient Region
    const region = await registry.region.getPatientRegion(req);
    
    // 2. Manage Payment Creation
    let paymentDetails = { status: 'Unpaid', transactionId: '', qrCode: '', paymentLink: '' };
    
    if (paymentProvider && paymentProvider !== 'None') {
      const plans = await registry.consultation.getPlans(clinicId);
      const chosenPlan = plans.find(p => p.name.toLowerCase() === consultationType.toLowerCase()) || { price: 50, currency: region.currency };
      
      const paymentResponse = await registry.payment.createPayment({
        clinicId,
        amount: chosenPlan.price,
        currency: chosenPlan.currency || region.currency,
        description: `Booking for ${consultationType}`,
        patientDetails: { name: patientName, email: patientEmail, phone: patientPhone }
      });
      
      if (paymentResponse.success) {
        paymentDetails = {
          status: paymentResponse.status || 'Unpaid',
          transactionId: paymentResponse.transactionId || '',
          qrCode: paymentResponse.qrCode || '',
          paymentLink: paymentResponse.paymentLink || ''
        };
      }
    }

    // 3. Book the appointment
    const bookingResponse = await registry.booking.bookAppointment({
      clinicId,
      patientName,
      patientPhone,
      patientEmail,
      consultationType,
      date,
      time,
      country: country || region.country,
      notes: notes || '',
      paymentProvider: paymentProvider || 'None',
      paymentStatus: paymentDetails.status,
      transactionId: paymentDetails.transactionId
    });

    if (!bookingResponse.success) {
      return res.status(400).json({ success: false, message: bookingResponse.message || 'Booking failed.' });
    }

    // 4. Send Confirmation Notification
    await registry.notification.sendNotification({
      clinicId,
      type: 'booking_confirm',
      recipient: { email: patientEmail, phone: patientPhone },
      payload: {
        patientName,
        consultationType,
        date,
        time,
        paymentLink: paymentDetails.paymentLink,
        qrCode: paymentDetails.qrCode
      }
    });

    res.status(201).json({
      success: true,
      message: 'Appointment booked successfully.',
      appointment: bookingResponse.appointment,
      payment: paymentDetails
    });
  } catch (error) {
    console.error('Booking API error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Get all appointments for a clinic (Private Dashboard)
// @route   GET /api/appointments
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const appointments = await Appointment.find({ clinicId: req.clinic.clinicId }).sort({ date: -1, time: -1 });
    res.json({ success: true, appointments });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Update appointment status
// @route   PUT /api/appointments/:id
// @access  Private
router.put('/:id', protect, async (req, res) => {
  try {
    const appointment = await Appointment.findOne({ _id: req.params.id, clinicId: req.clinic.clinicId });

    if (appointment) {
      appointment.status = req.body.status || appointment.status;
      appointment.paymentStatus = req.body.paymentStatus || appointment.paymentStatus;
      
      const updatedApp = await appointment.save();
      res.json({ success: true, appointment: updatedApp });
    } else {
      res.status(404).json({ success: false, message: 'Appointment not found.' });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
