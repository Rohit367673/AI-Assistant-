import PaymentProvider from '../base/PaymentProvider.js';
import Clinic from '../../models/Clinic.js';

export default class InternalPaymentProvider extends PaymentProvider {
  async createPayment({ clinicId, amount, currency, description }) {
    try {
      const clinic = await Clinic.findOne({ clinicId });
      const upiUrl = clinic?.paymentSettings?.qrValue || `upi://pay?pa=clinic@upi&pn=${encodeURIComponent(clinic?.name || 'ClinicAI')}&am=${amount}&cu=${currency || 'INR'}`;
      
      return {
        success: true,
        paymentLink: `http://localhost:5173/checkout/pay?clinicId=${clinicId}&amount=${amount}`,
        qrCode: upiUrl,
        transactionId: 'tx_' + Math.random().toString(36).substring(2, 11),
        status: 'Unpaid'
      };
    } catch (error) {
      return {
        success: false,
        message: error.message
      };
    }
  }

  async verifyPayment(transactionId) {
    // Simulated verification: auto-approves for internal SaaS dummy testing
    return {
      success: true,
      status: 'Paid',
      transactionId
    };
  }
}
