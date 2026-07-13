export default class PaymentProvider {
  constructor(config = {}) {
    this.config = config;
  }

  // Returns: { success: boolean, paymentLink: string, qrCode: string, transactionId: string, status: string }
  async createPayment(paymentData) {
    throw new Error('createPayment() not implemented');
  }

  // Returns: { success: boolean, status: 'Paid' | 'Unpaid', transactionId: string }
  async verifyPayment(transactionId) {
    throw new Error('verifyPayment() not implemented');
  }
}
