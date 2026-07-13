import PaymentProvider from '../base/PaymentProvider.js';
import axios from 'axios';

export default class ExternalPaymentProvider extends PaymentProvider {
  async createPayment(paymentData) {
    const { webhookUrl, apiKey } = this.config;
    if (!webhookUrl) {
      throw new Error('External Payment Provider: webhookUrl not configured.');
    }

    try {
      const response = await axios.post(`${webhookUrl}/payments/create`, paymentData, {
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

  async verifyPayment(transactionId) {
    const { webhookUrl, apiKey } = this.config;
    if (!webhookUrl) {
      throw new Error('External Payment Provider: webhookUrl not configured.');
    }

    try {
      const response = await axios.post(`${webhookUrl}/payments/verify`, { transactionId }, {
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
}
