import AuthProvider from '../base/AuthProvider.js';
import jwt from 'jsonwebtoken';
import Clinic from '../../models/Clinic.js';

export default class InternalAuthProvider extends AuthProvider {
  async verifySession(token, clinicId) {
    try {
      if (!token) {
        // Return standard Guest patient session state
        return {
          authenticated: false,
          patient: {
            id: 'guest_' + Math.random().toString(36).substring(2, 9),
            name: 'Guest Patient',
            email: 'guest@aidoctor.com',
            phone: '',
            role: 'guest'
          }
        };
      }

      // Check if it is a dashboard admin JWT token or similar
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const clinic = await Clinic.findById(decoded.id);
      
      if (clinic && clinic.clinicId === clinicId) {
        return {
          authenticated: true,
          patient: {
            id: clinic._id.toString(),
            name: clinic.doctorName,
            email: clinic.email,
            phone: '',
            role: 'doctor'
          }
        };
      }

      return { authenticated: false, patient: null };
    } catch (error) {
      return { authenticated: false, patient: null, error: error.message };
    }
  }
}
