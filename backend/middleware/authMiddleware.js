import jwt from 'jsonwebtoken';
import Clinic from '../models/Clinic.js';
import dotenv from 'dotenv';

dotenv.config();

export const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Select clinic minus password
      req.clinic = await Clinic.findById(decoded.id).select('-password');
      if (!req.clinic) {
        return res.status(401).json({ success: false, message: 'Not authorized, clinic not found' });
      }
      
      next();
    } catch (error) {
      console.error('JWT validation error:', error);
      return res.status(401).json({ success: false, message: 'Not authorized, token validation failed' });
    }
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Not authorized, no token provided' });
  }
};
