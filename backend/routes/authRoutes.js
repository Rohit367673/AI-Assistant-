import express from 'express';
import jwt from 'jsonwebtoken';
import Clinic from '../models/Clinic.js';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();

// Helper to sign JWT
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

// @desc    Register a new clinic
// @route   POST /api/auth/register
// @access  Public
router.post('/register', async (req, res) => {
  const { clinicId, email, password, name } = req.body;

  try {
    // Check if clinicId exists
    const idExists = await Clinic.findOne({ clinicId });
    if (idExists) {
      return res.status(400).json({ success: false, message: 'Clinic ID is already taken.' });
    }

    // Check if email exists
    const emailExists = await Clinic.findOne({ email });
    if (emailExists) {
      return res.status(400).json({ success: false, message: 'Email address is already registered.' });
    }

    // Create clinic
    const clinic = await Clinic.create({
      clinicId,
      email,
      password,
      name,
      businessHours: [
        { day: 'Monday', open: '09:00', close: '17:00', enabled: true },
        { day: 'Tuesday', open: '09:00', close: '17:00', enabled: true },
        { day: 'Wednesday', open: '09:00', close: '17:00', enabled: true },
        { day: 'Thursday', open: '09:00', close: '17:00', enabled: true },
        { day: 'Friday', open: '09:00', close: '17:00', enabled: true },
        { day: 'Saturday', open: '09:00', close: '13:00', enabled: true },
        { day: 'Sunday', open: '09:00', close: '13:00', enabled: false }
      ]
    });

    if (clinic) {
      res.status(201).json({
        success: true,
        token: generateToken(clinic._id),
        clinic: {
          id: clinic._id,
          clinicId: clinic.clinicId,
          email: clinic.email,
          name: clinic.name
        }
      });
    } else {
      res.status(400).json({ success: false, message: 'Invalid clinic details.' });
    }
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Auth clinic & get token
// @route   POST /api/auth/login
// @access  Public
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const clinic = await Clinic.findOne({ email });

    if (clinic && (await clinic.comparePassword(password))) {
      res.json({
        success: true,
        token: generateToken(clinic._id),
        clinic: {
          id: clinic._id,
          clinicId: clinic.clinicId,
          email: clinic.email,
          name: clinic.name,
          themeColor: clinic.themeColor,
          subscriptionPlan: clinic.subscriptionPlan
        }
      });
    } else {
      res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
