import express from 'express';
import fs from 'fs';
import path from 'path';

const router = express.Router();

// Mock External In-Memory Database for demonstration testing
const mockDb = {
  appointments: [],
  payments: {},
  documents: []
};

// 1. Slots Provider Endpoint
router.get('/appointments/slots', (req, res) => {
  const { date } = req.query;
  console.log(`[Mock External System] Slot Check requested for date: ${date}`);
  
  // Return standard mock slots for testing (skip some times dynamically to simulate doctor availability)
  const isWeekend = date ? (new Date(date).getDay() === 0 || new Date(date).getDay() === 6) : false;
  
  if (isWeekend) {
    return res.json({ slots: ['09:00', '10:00', '11:00'] });
  }
  return res.json({ slots: ['10:00', '11:00', '13:00', '14:00', '15:00', '16:00'] });
});

// 2. Booking Provider Endpoint
router.post('/appointments/book', (req, res) => {
  const booking = req.body;
  console.log('[Mock External System] Appointment Booking Requested:', booking);

  const { date, time, clinicId } = booking;
  
  // Duplicate check
  const isDuplicate = mockDb.appointments.some(app => app.date === date && app.time === time && app.clinicId === clinicId && app.status !== 'Cancelled');
  if (isDuplicate) {
    return res.status(400).json({
      success: false,
      message: 'This time slot is already booked. Please select another slot.'
    });
  }

  // Daily limit check (10 appointments max)
  const dailyCount = mockDb.appointments.filter(app => app.date === date && app.clinicId === clinicId && app.status !== 'Cancelled').length;
  if (dailyCount >= 10) {
    return res.status(400).json({
      success: false,
      message: 'This date has reached the maximum daily limit of 10 appointments. Please choose another date.'
    });
  }
  
  const appointmentId = 'ext_app_' + Math.random().toString(36).substring(2, 10);
  const record = {
    id: appointmentId,
    ...booking,
    status: 'Confirmed',
    source: 'External Website Integration'
  };
  mockDb.appointments.push(record);
  
  res.status(201).json({
    success: true,
    message: 'Simulated external database booking complete.',
    appointment: record
  });
});

// 3. Payment Provider - Create
router.post('/payments/create', (req, res) => {
  const { amount, currency, description } = req.body;
  console.log(`[Mock External System] Payment Request of: ${amount} ${currency || 'USD'}`);
  
  const txId = 'ext_tx_' + Math.random().toString(36).substring(2, 10);
  const payment = {
    txId,
    amount,
    currency: currency || 'USD',
    description,
    status: 'Unpaid',
    qrCode: `upi://pay?pa=nephroconsult@upi&pn=NephroConsult&am=${amount}&cu=${currency || 'INR'}`,
    paymentLink: `https://test.nephroconsult.com/checkout/pay?tx=${txId}`
  };
  
  mockDb.payments[txId] = payment;
  
  res.json({
    success: true,
    paymentLink: payment.paymentLink,
    qrCode: payment.qrCode,
    transactionId: txId,
    status: 'Unpaid'
  });
});

// 4. Payment Provider - Verify
router.post('/payments/verify', (req, res) => {
  const { transactionId } = req.body;
  console.log(`[Mock External System] Verify Transaction Request: ${transactionId}`);
  
  if (mockDb.payments[transactionId]) {
    mockDb.payments[transactionId].status = 'Paid';
  }

  res.json({
    success: true,
    status: 'Paid',
    transactionId
  });
});

// 5. Region Provider Endpoint
router.get('/region', (req, res) => {
  console.log('[Mock External System] Region detection request');
  res.json({
    country: 'IN',
    currency: 'INR',
    timezone: 'Asia/Kolkata',
    locale: 'en-IN',
    language: 'en'
  });
});

// 6. Consultation Plans Provider Endpoint
router.get('/plans', (req, res) => {
  console.log('[Mock External System] Get Consultation Plans');
  res.json({
    plans: [
      {
        id: 'nc-initial-consult',
        name: 'Initial Consultation',
        description: 'Comprehensive kidney health assessment with detailed medical history review',
        duration: 45,
        price: 499,
        currency: 'INR',
        benefits: [
          'Complete kidney function evaluation',
          'Personalized treatment plan',
          'Lab report analysis',
          'Lifestyle recommendations'
        ],
        requiredDocuments: ['Lab Report', 'Prescription History']
      },
      {
        id: 'nc-followup-consult',
        name: 'Follow-up Consultation',
        description: 'Progress review and treatment adjustment for existing patients',
        duration: 30,
        price: 399,
        currency: 'INR',
        benefits: [
          'Treatment progress review',
          'Medication adjustments',
          'Lab results discussion',
          'Next steps planning'
        ],
        requiredDocuments: ['Recent Blood Report']
      },
      {
        id: 'nc-urgent-consult',
        name: 'Urgent Consultation',
        description: 'Priority consultation for urgent kidney health concerns (10 AM - 10 PM IST)',
        duration: 45,
        price: 999,
        currency: 'INR',
        benefits: [
          'Connect within 1 hour',
          'Priority scheduling (10 AM - 10 PM IST)',
          'Urgent symptom evaluation',
          'Immediate treatment plan'
        ],
        requiredDocuments: []
      }
    ]
  });
});

// 7. Auth Provider Endpoint
router.post('/auth/verify-session', (req, res) => {
  const { token } = req.body;
  console.log(`[Mock External System] Session verification for token: ${token}`);
  res.json({
    authenticated: true,
    patient: {
      id: 'ext_pat_36767',
      name: 'John Miller',
      email: 'john.miller@example.com',
      phone: '+919999999999',
      role: 'patient'
    }
  });
});

// 8. Document Provider Endpoint
router.post('/documents/upload', (req, res) => {
  const { filename, mimetype, file, clinicId } = req.body;
  console.log(`[Mock External System] Received document upload: ${filename} for clinic ${clinicId}`);
  
  try {
    const publicDir = path.resolve('public');
    const extUploadsDir = path.join(publicDir, 'uploads', 'external');
    
    if (!fs.existsSync(extUploadsDir)) {
      fs.mkdirSync(extUploadsDir, { recursive: true });
    }

    const savedFilename = `ext_${Date.now()}_${filename.replace(/\s+/g, '_')}`;
    const filePath = path.join(extUploadsDir, savedFilename);
    
    fs.writeFileSync(filePath, Buffer.from(file, 'base64'));
    
    const fileUrl = `http://localhost:5001/uploads/external/${savedFilename}`;
    res.json({
      success: true,
      url: fileUrl,
      key: `external/${clinicId}/${savedFilename}`
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 9. Notification Provider Endpoint
router.post('/notifications/send', (req, res) => {
  const { type, recipient, payload } = req.body;
  console.log(`[Mock External System - Notification Alert] Dispatched external notification of type: ${type}`);
  console.log(`To: ${recipient.email || recipient.phone}`);
  console.log(`Details: ${JSON.stringify(payload)}`);
  
  res.json({
    success: true,
    message: 'Notification sent successfully via external dispatch channel.'
  });
});

// 10. Knowledge Search Provider Endpoint
router.get('/knowledge/search', (req, res) => {
  const { query } = req.query;
  console.log(`[Mock External System] Knowledge Search Query: "${query}"`);
  
  // Custom mock kidney RAG answers for NephroConsult testing
  let context = 'Kidney Health Guidelines:\n- Renal diet recommends keeping sodium intake below 2000mg per day.\n- Patients on dialysis must monitor fluid gains between sessions closely.\n- Kidney stones prevention includes drinking 3 liters of water daily.';
  
  if (query.toLowerCase().includes('dialysis')) {
    context = 'Dialysis Care Instructions:\n- Keep the fistula site clean and dry.\n- Check daily for thrill/bruit sound to verify flow.\n- Notify Dr. Patel immediately if fever or redness develops.';
  } else if (query.toLowerCase().includes('diet') || query.toLowerCase().includes('food')) {
    context = 'Renal Diet Guide:\n- Avoid foods high in potassium (bananas, potatoes, tomatoes).\n- Limit phosphorus rich items (dairy, cola drinks, nuts).\n- Focus on lean proteins and high-fiber safe foods.';
  }

  res.json({ context });
});

export default router;
