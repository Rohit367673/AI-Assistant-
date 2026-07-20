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

    const customAppId = clinic?.paymentSettings?.cashfreeAppId || process.env.CASHFREE_APP_ID;
    const customSecretKey = clinic?.paymentSettings?.cashfreeSecretKey || process.env.CASHFREE_SECRET_KEY;
    const configuredEnv = clinic?.paymentSettings?.cashfreeEnvironment || process.env.CASHFREE_ENVIRONMENT || 'sandbox';

    const orderId = 'cf_ord_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    const orderAmount = amount || 399;
    const orderCurrency = currency || 'INR';

    let cleanPhone = (patientInfo?.phone || '9999999999').replace(/\D/g, '');
    if (cleanPhone.length > 10) cleanPhone = cleanPhone.slice(-10);
    if (cleanPhone.length < 10) cleanPhone = '9999999999';

    const cleanEmail = patientInfo?.email || 'patient@nephroconsult.com';
    const cleanName = patientInfo?.name || 'NephroConsult Patient';

    const orderPayload = {
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
    };

    // Attempt 1: If custom credentials provided, try configured & auto-detected environments
    if (customAppId && customSecretKey) {
      const isProdKey = !customAppId.startsWith('TEST');
      const targetEnv = isProdKey ? 'production' : configuredEnv;
      const targetUrl = targetEnv === 'production' 
        ? 'https://api.cashfree.com/pg/orders' 
        : 'https://sandbox.cashfree.com/pg/orders';

      try {
        const resp = await axios.post(targetUrl, orderPayload, {
          headers: {
            'x-client-id': customAppId,
            'x-client-secret': customSecretKey,
            'x-api-version': '2023-08-01',
            'Content-Type': 'application/json'
          }
        });

        return res.json({
          success: true,
          orderId: resp.data.order_id,
          paymentSessionId: resp.data.payment_session_id,
          mode: targetEnv,
          cashfreeAppId: customAppId
        });
      } catch (err1) {
        console.warn(`Cashfree custom key error on ${targetUrl}:`, err1.response?.data || err1.message);

        // Retry on alternate environment (Production vs Sandbox)
        const altUrl = targetEnv === 'production' 
          ? 'https://sandbox.cashfree.com/pg/orders' 
          : 'https://api.cashfree.com/pg/orders';
        const altEnv = targetEnv === 'production' ? 'sandbox' : 'production';

        try {
          const respAlt = await axios.post(altUrl, orderPayload, {
            headers: {
              'x-client-id': customAppId,
              'x-client-secret': customSecretKey,
              'x-api-version': '2023-08-01',
              'Content-Type': 'application/json'
            }
          });

          return res.json({
            success: true,
            orderId: respAlt.data.order_id,
            paymentSessionId: respAlt.data.payment_session_id,
            mode: altEnv,
            cashfreeAppId: customAppId
          });
        } catch (errAlt) {
          console.warn(`Cashfree custom key error on alternate ${altUrl}:`, errAlt.response?.data || errAlt.message);
        }
      }
    }

    // Attempt 2: Fallback to Cashfree Official Sandbox Test credentials
    const testAppId = 'TEST108386203fd97c98761cc8cc4b1402683801';
    const testSecretKey = 'TEST27ed5d95e79dbec26c04f58cbfcfd89fb6ba572d';

    try {
      const respTest = await axios.post('https://sandbox.cashfree.com/pg/orders', orderPayload, {
        headers: {
          'x-client-id': testAppId,
          'x-client-secret': testSecretKey,
          'x-api-version': '2023-08-01',
          'Content-Type': 'application/json'
        }
      });

      return res.json({
        success: true,
        orderId: respTest.data.order_id,
        paymentSessionId: respTest.data.payment_session_id,
        mode: 'sandbox',
        cashfreeAppId: testAppId
      });
    } catch (errTest) {
      console.error('Cashfree Test credentials fallback error:', errTest.response?.data || errTest.message);
      return res.status(400).json({
        success: false,
        message: errTest.response?.data?.message || 'Cashfree payment session initiation failed.'
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
