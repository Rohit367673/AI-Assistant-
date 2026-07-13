import BookingProvider from '../base/BookingProvider.js';
import axios from 'axios';

export default class ExternalBookingProvider extends BookingProvider {
  async bookAppointment(bookingData) {
    const { webhookUrl, apiKey } = this.config;
    if (!webhookUrl) {
      throw new Error('External Booking Provider: webhookUrl not configured.');
    }

    try {
      const response = await axios.post(`${webhookUrl}/appointments/book`, bookingData, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey || ''}`
        }
      });
      return response.data;
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || error.message
      };
    }
  }

  async getAvailableSlots(clinicId, date) {
    const { webhookUrl, apiKey } = this.config;
    if (!webhookUrl) return [];

    try {
      const response = await axios.get(`${webhookUrl}/appointments/slots`, {
        params: { clinicId, date },
        headers: {
          'Authorization': `Bearer ${apiKey || ''}`
        }
      });
      return response.data?.slots || [];
    } catch (error) {
      console.error('External Booking Provider getAvailableSlots error:', error.message);
      return [];
    }
  }
}
