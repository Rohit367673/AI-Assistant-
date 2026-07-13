import express from 'express';
import Clinic from '../models/Clinic.js';
import Appointment from '../models/Appointment.js';
import Conversation from '../models/Conversation.js';
import { protect } from '../middleware/authMiddleware.js';
import ProviderRegistry from '../providers/ProviderRegistry.js';

const router = express.Router();

// @desc    Get clinic configurations by clinicId (Public endpoint for assistant embed)
// @route   GET /api/clinic/settings
// @access  Public
router.get('/settings', async (req, res) => {
  const { clinicId } = req.query;

  if (!clinicId) {
    return res.status(400).json({ success: false, message: 'clinicId query parameter is required.' });
  }

  try {
    const clinic = await Clinic.findOne({ clinicId });

    if (!clinic) {
      return res.status(404).json({ success: false, message: 'Clinic not found.' });
    }

    // Resolve clinic integration providers
    const registry = await ProviderRegistry.resolveClinicProviders(clinicId);
    const plans = await registry.consultation.getPlans(clinicId);
    
    const settings = clinic.toObject();
    if (plans && plans.length > 0) {
      settings.consultationTypes = plans.map(p => ({
        _id: p.id,
        name: p.name,
        fee: p.price
      }));
    }

    res.json({ success: true, settings });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Get available slots dynamically for a selected date
// @route   GET /api/clinic/settings/slots
// @access  Public
router.get('/settings/slots', async (req, res) => {
  const { clinicId, date } = req.query;

  if (!clinicId || !date) {
    return res.status(400).json({ success: false, message: 'clinicId and date query parameters are required.' });
  }

  try {
    const registry = await ProviderRegistry.resolveClinicProviders(clinicId);
    const slots = await registry.booking.getAvailableSlots(clinicId, date);
    res.json({ success: true, slots });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Get logged in clinic details (Dashboard Admin view)
// @route   GET /api/clinic/profile
// @access  Private
router.get('/profile', protect, async (req, res) => {
  res.json({ success: true, clinic: req.clinic });
});

// @desc    Update clinic configurations
// @route   PUT /api/clinic/profile
// @access  Private
router.put('/profile', protect, async (req, res) => {
  try {
    const clinic = await Clinic.findById(req.clinic._id);

    if (clinic) {
      clinic.name = req.body.name || clinic.name;
      clinic.doctorName = req.body.doctorName || clinic.doctorName;
      clinic.specialization = req.body.specialization || clinic.specialization;
      clinic.logo = req.body.logo !== undefined ? req.body.logo : clinic.logo;
      clinic.themeColor = req.body.themeColor || clinic.themeColor;
      clinic.welcomeMessage = req.body.welcomeMessage || clinic.welcomeMessage;
      clinic.promptConfig = req.body.promptConfig || clinic.promptConfig;
      clinic.businessHours = req.body.businessHours || clinic.businessHours;
      clinic.appointmentSlots = req.body.appointmentSlots || clinic.appointmentSlots;
      clinic.consultationTypes = req.body.consultationTypes || clinic.consultationTypes;
      
      if (req.body.paymentSettings) {
        clinic.paymentSettings = {
          ...clinic.paymentSettings,
          ...req.body.paymentSettings
        };
      }

      if (req.body.subscriptionPlan && clinic.subscriptionPlan !== req.body.subscriptionPlan) {
        clinic.subscriptionPlan = req.body.subscriptionPlan;
      }

      const updatedClinic = await clinic.save();
      res.json({ success: true, clinic: updatedClinic });
    } else {
      res.status(404).json({ success: false, message: 'Clinic not found.' });
    }
  } catch (error) {
    console.error('Update clinic profile error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Get dashboard analytics metrics
// @route   GET /api/clinic/analytics
// @access  Private
router.get('/analytics', protect, async (req, res) => {
  const clinicId = req.clinic.clinicId;
  const today = new Date().toISOString().split('T')[0];

  try {
    // Total conversations count
    const totalConversations = await Conversation.countDocuments({ clinicId });

    // Total appointments count
    const totalAppointments = await Appointment.countDocuments({ clinicId });

    // Today's appointments count
    const todayAppointments = await Appointment.countDocuments({ clinicId, date: today });

    // Fetch lists for details
    const appointmentsList = await Appointment.find({ clinicId })
      .sort({ date: 1, time: 1 })
      .limit(10);

    // Estimate AI Usage (represented by average counts of messages in database)
    const allConversations = await Conversation.find({ clinicId }).select('messages');
    const totalMessages = allConversations.reduce((acc, conv) => acc + conv.messages.length, 0);
    const estimatedTokens = totalMessages * 150; // average 150 tokens per message

    // Return dashboard stats
    res.json({
      success: true,
      analytics: {
        totalConversations,
        totalAppointments,
        todayAppointments,
        estimatedTokens,
        subscriptionPlan: req.clinic.subscriptionPlan,
        subscriptionStatus: req.clinic.subscriptionStatus,
        recentAppointments: appointmentsList
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
