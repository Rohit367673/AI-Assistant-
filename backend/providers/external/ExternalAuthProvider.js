import AuthProvider from '../base/AuthProvider.js';
import axios from 'axios';

export default class ExternalAuthProvider extends AuthProvider {
  async verifySession(token, clinicId) {
    const { webhookUrl, apiKey } = this.config;
    if (!webhookUrl) {
      // Fallback guest verification for external clinics without active auth configuration
      return {
        authenticated: false,
        patient: {
          id: 'ext_guest_' + Math.random().toString(36).substring(2, 9),
          name: 'Guest Patient',
          email: 'guest@external.com',
          phone: '',
          role: 'guest'
        }
      };
    }

    try {
      const response = await axios.post(`${webhookUrl}/auth/verify-session`, { token, clinicId }, {
        headers: {
          'Authorization': `Bearer ${apiKey || ''}`
        }
      });
      return response.data;
    } catch (error) {
      console.error('External Auth Provider verification failed, falling back to guest:', error.message);
      return {
        authenticated: false,
        patient: {
          id: 'ext_guest_' + Math.random().toString(36).substring(2, 9),
          name: 'Guest Patient',
          email: 'guest@external.com',
          phone: '',
          role: 'guest'
        }
      };
    }
  }
}
