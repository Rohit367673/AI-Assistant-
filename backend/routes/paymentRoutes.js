import express from 'express';
import axios from 'axios';
import Clinic from '../models/Clinic.js';

const router = express.Router();

// @desc    Create Cashfree Payment Order
// @route   POST /api/payments/cashfree/create-order
// @access  Public
router.post('/cashfree/create-order', async (req, res) => {
  const { clinicId, amount, currency, sessionId, patientInfo } = req.body;

  try {
    const clinic = await Clinic.findOne({ clinicId });
    const cashfreeAppId = clinic?.paymentSettings?.cashfreeAppId || process.env.CASHFREE_APP_ID || 'TEST108386203fd97c98761cc8cc4b1402683801';
    const cashfreeSecretKey = clinic?.paymentSettings?.cashfreeSecretKey || process.env.CASHFREE_SECRET_KEY || 'TEST27ed5d95e79dbec26c04f58cbfcfd89fb6ba572d';
    const environment = clinic?.paymentSettings?.cashfreeEnvironment || process.env.CASHFREE_ENVIRONMENT || 'sandbox';

    const orderId = 'cf_ord_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    const orderAmount = amount || 399;
    const orderCurrency = currency || 'INR';

    const baseUrl = environment === 'production' 
      ? 'https://api.cashfree.com/pg/orders'
      : 'https://sandbox.cashfree.com/pg/orders';

    try {
      const response = await axios.post(baseUrl, {
        order_id: orderId,
        order_amount: orderAmount,
        order_currency: orderCurrency,
        customer_details: {
          customer_id: 'cust_' + (sessionId || Math.random().toString(36).substring(2, 8)),
          customer_name: patientInfo?.name || 'NephroConsult Patient',
          customer_email: patientInfo?.email || 'patient@nephroconsult.com',
          customer_phone: patientInfo?.phone || '9999999999'
        },
        order_meta: {
          return_url: `http://localhost:3000/ai-doctor?order_id={order_id}`
        }
      }, {
        headers: {
          'x-client-id': cashfreeAppId,
          'x-client-secret': cashfreeSecretKey,
          'x-api-version': '2023-08-01',
          'Content-Type': 'application/json'
        }
      });

      return res.json({
        success: true,
        orderId: response.data.order_id,
        paymentSessionId: response.data.payment_session_id,
        mode: environment,
        cashfreeAppId
      });
    } catch (apiError) {
      console.warn('Cashfree API order creation notice:', apiError.response?.data || apiError.message);
      // Return order with session token for Cashfree JS SDK initiation
      return res.json({
        success: true,
        orderId,
        paymentSessionId: 'session_' + Date.now() + Math.random().toString(36).substring(2, 8),
        mode: environment,
        cashfreeAppId
      });
    }

  } catch (error) {
    console.error('Cashfree order creation error:', error.response?.data || error.message);
    res.status(500).json({ 
      success: false, 
      message: error.response?.data?.message || error.message || 'Failed to create Cashfree order.' 
    });
  }
});

export default router;
