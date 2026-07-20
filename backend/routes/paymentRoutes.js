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
    let clinic = null;
    if (clinicId) {
      clinic = await Clinic.findOne({ clinicId });
    }

    const cashfreeAppId = clinic?.paymentSettings?.cashfreeAppId || process.env.CASHFREE_APP_ID || 'TEST108386203fd97c98761cc8cc4b1402683801';
    const cashfreeSecretKey = clinic?.paymentSettings?.cashfreeSecretKey || process.env.CASHFREE_SECRET_KEY || 'TEST27ed5d95e79dbec26c04f58cbfcfd89fb6ba572d';
    const environment = clinic?.paymentSettings?.cashfreeEnvironment || process.env.CASHFREE_ENVIRONMENT || 'sandbox';

    const orderId = 'cf_ord_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    const orderAmount = amount || 399;
    const orderCurrency = currency || 'INR';

    // Format phone to 10 digits as required by Cashfree API
    let cleanPhone = (patientInfo?.phone || '9999999999').replace(/\D/g, '');
    if (cleanPhone.length > 10) cleanPhone = cleanPhone.slice(-10);
    if (cleanPhone.length < 10) cleanPhone = '9999999999';

    const cleanEmail = patientInfo?.email || 'patient@nephroconsult.com';
    const cleanName = patientInfo?.name || 'NephroConsult Patient';

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
          customer_name: cleanName,
          customer_email: cleanEmail,
          customer_phone: cleanPhone
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
      const errorData = apiError.response?.data;
      const errorMsg = errorData?.message || errorData?.error || apiError.message;
      console.error('Cashfree API Error Response:', errorData || apiError.message);
      
      return res.status(400).json({
        success: false,
        message: errorMsg || 'Cashfree payment session creation failed.'
      });
    }

  } catch (error) {
    console.error('Cashfree order creation error:', error.message);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Failed to create Cashfree order.' 
    });
  }
});

export default router;
