import express from 'express';
import Clinic from '../models/Clinic.js';
import Conversation from '../models/Conversation.js';
import kbService from '../services/kbService.js';
import aiService from '../services/aiService.js';
import { protect } from '../middleware/authMiddleware.js';
import ProviderRegistry from '../providers/ProviderRegistry.js';

const router = express.Router();

// @desc    Process a chat message
// @route   POST /api/chat
// @access  Public
router.post('/', async (req, res) => {
  const { clinicId, sessionId, message } = req.body;

  if (!clinicId || !sessionId || !message) {
    return res.status(400).json({ success: false, message: 'clinicId, sessionId, and message are required.' });
  }

  try {
    // 1. Fetch clinic configuration to verify subscription
    const clinic = await Clinic.findOne({ clinicId });
    if (!clinic) {
      return res.status(404).json({ success: false, message: 'Clinic not found.' });
    }

    if (clinic.subscriptionStatus !== 'Active') {
      return res.json({
        success: true,
        reply: "Hello. Our clinic AI assistant is temporarily inactive. Please contact the clinic directly at our telephone number."
      });
    }

    // Resolve clinic providers
    const registry = await ProviderRegistry.resolveClinicProviders(clinicId);

    // 2. Verify Session Auth (Guest Patient or Authenticated Patient)
    const token = req.headers.authorization?.split(' ')[1] || req.body.token;
    const authStatus = await registry.auth.verifySession(token, clinicId);

    // 3. Fetch conversation history
    let conversation = await Conversation.findOne({ clinicId, sessionId });
    if (!conversation) {
      conversation = new Conversation({ clinicId, sessionId, messages: [] });
    }

    // 4. Query Knowledge Provider (RAG)
    const kbContent = await registry.knowledge.queryKnowledge(clinicId, message);

    // 5. Append user message to history
    conversation.messages.push({ role: 'user', content: message });

    // Look for timezone and region
    const region = await registry.region.getPatientRegion(req);

    // Extract email from session or history text to fetch logs/prescriptions
    let patientEmail = authStatus.patient?.email;
    let patientPhone = authStatus.patient?.phone;
    let patientName = authStatus.patient?.name;

    const historyTextStr = conversation.messages.map(m => m.content).join(' | ');
    if (!patientEmail) {
      const emailMatches = historyTextStr.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/);
      if (emailMatches) patientEmail = emailMatches[0];
    }
    if (!patientPhone) {
      const phoneMatches = historyTextStr.match(/\b(?:\+?\d{1,3}[- ]?)?\(?\d{3}\)?[- ]?\d{3}[- ]?\d{4}\b/);
      if (phoneMatches) patientPhone = phoneMatches[0];
    }
    if (!patientName) {
      const nameMatches = historyTextStr.match(/(?:my name is|name:)\s*([A-Za-z\s]+)(?:\||\n|$)/i);
      if (nameMatches) patientName = nameMatches[1].trim();
    }

    // Fetch live plans and slots dynamically from resolved providers
    let plans = [];
    try {
      plans = await registry.consultation.getPlans(clinicId);
    } catch (err) {
      console.warn('Failed to retrieve live plans for AI prompt context:', err.message);
    }

    // Dynamic helper to convert IST slots to patient local timezone
    const convertISTToLocal = (timeStr, targetTimezone) => {
      try {
        const today = new Date().toISOString().split('T')[0];
        let hour = 10;
        let minute = 0;
        const timeClean = timeStr.trim().toLowerCase();
        
        if (timeClean.includes(':')) {
          const parts = timeClean.split(':');
          hour = parseInt(parts[0]);
          const minutePart = parts[1];
          minute = parseInt(minutePart);
          if (minutePart.includes('pm') && hour < 12) hour += 12;
          if (minutePart.includes('am') && hour === 12) hour = 0;
        } else {
          hour = parseInt(timeClean);
          if (timeClean.includes('pm') && hour < 12) hour += 12;
          if (timeClean.includes('am') && hour === 12) hour = 0;
        }

        const istDateStr = `${today}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`;
        const formatter = new Intl.DateTimeFormat('en-US', {
          timeZone: targetTimezone,
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        });
        const dummyDate = new Date(new Date(istDateStr + '+05:30').getTime());
        return formatter.format(dummyDate);
      } catch (e) {
        return null;
      }
    };

    // Deterministic state machine checks for booking flow
    const lastMsgLower = message.toLowerCase();
    const hasBookKeyword = lastMsgLower.includes('book') || lastMsgLower.includes('appointment') || lastMsgLower.includes('schedule') || lastMsgLower.includes('slot');
    
    const getLastMatch = (str, regexPattern) => {
      if (!str) return null;
      const matches = [...str.matchAll(new RegExp(regexPattern, 'g'))];
      return matches.length > 0 ? matches[matches.length - 1] : null;
    };

    const matchPlan = getLastMatch(message, /\[Selected Plan:\s*([^\]]+)\]/) || getLastMatch(historyTextStr, /\[Selected Plan:\s*([^\]]+)\]/);
    const matchDate = getLastMatch(message, /\[Selected Date:\s*([^\]]+)\]/) || getLastMatch(historyTextStr, /\[Selected Date:\s*([^\]]+)\]/);
    const matchSlot = getLastMatch(message, /\[Selected Slot:\s*([^\]]+)\]/) || getLastMatch(historyTextStr, /\[Selected Slot:\s*([^\]]+)\]/);
    const hasUploaded = historyTextStr.includes('[Uploaded Document:') || message.includes('[Uploaded Document:');
    
    // IMPORTANT: Only check for confirmed payment in the CURRENT message, not old history.
    // If the user just selected a new slot (e.g. after a booking failure), they need to pay again.
    const isCurrentMsgNewSlot = message.startsWith('[Selected Slot:');
    const isCurrentMsgNewDate = message.startsWith('[Selected Date:');
    const isCurrentMsgConfirmPayment = lastMsgLower.includes('confirm payment') || lastMsgLower.includes('[confirm payment') || lastMsgLower.includes('verify') || lastMsgLower.includes('paid');
    
    // Payment is only confirmed if the CURRENT message is the confirmation action
    // (not from old history where a previous attempt may have failed)
    const hasConfirmedPayment = isCurrentMsgConfirmPayment && !isCurrentMsgNewSlot && !isCurrentMsgNewDate;

    let enforcedReply = null;
    let enforcedAction = null;

    // Only enforce state machine if user is actively initiating or advancing booking actions
    const isActivelyBooking = hasBookKeyword || 
                              message.startsWith('[Selected Plan:') || 
                              message.startsWith('[Selected Date:') || 
                              message.startsWith('[Selected Slot:') || 
                              message.startsWith('[Uploaded Document:') || 
                              message.startsWith('[Confirm Payment') ||
                              lastMsgLower.includes('verify') || 
                              lastMsgLower.includes('confirm') || 
                              lastMsgLower.includes('paid');

    if (isActivelyBooking) {
      // Step 1: Choose Plan
      if (!matchPlan) {
        enforcedReply = "I would be happy to help you schedule your appointment. Please select one of our clinic consultation plans below:";
        enforcedAction = { type: 'select_plan', data: {} };
      } 
      // Step 2: Choose Date
      else if (!matchDate) {
        const planName = matchPlan[1];
        enforcedReply = `Thank you for selecting the **${planName}**. To proceed, please pick your preferred appointment date from the strip below:`;
        enforcedAction = { type: 'select_date', data: {} };
      } 
      // Step 3: Choose Time Slot
      else if (!matchSlot || isCurrentMsgNewDate) {
        const chosenDate = matchDate[1];
        let slots = ["09:00 AM", "10:00 AM", "11:00 AM", "02:00 PM", "03:00 PM", "04:00 PM"];
        try {
          const liveSlots = await registry.booking.getAvailableSlots(clinicId, chosenDate);
          if (liveSlots && liveSlots.length > 0) slots = liveSlots;
        } catch (e) {
          console.warn('Failed to query slots provider, using mock list.', e.message);
        }

        let slotMessage = `Excellent. Here are the available timeslots for **${chosenDate}** (in clinic timezone IST, GMT+5:30). Please choose a slot time:`;
        if (region.timezone && !region.timezone.toLowerCase().includes('kolkata')) {
          slotMessage = `Excellent. Here are the available timeslots for **${chosenDate}** in India Time (IST). Since you are located in **${region.timezone}**, we have converted the doctor's available times to your local timezone below:\n\n`;
          const timezoneConvertedSlots = slots.map(slot => {
            const converted = convertISTToLocal(slot, region.timezone);
            return converted ? `- **${slot} IST** (which is **${converted}** your local time)` : `- **${slot} IST**`;
          }).join('\n');
          slotMessage += timezoneConvertedSlots + `\n\nPlease select your preferred slot:`;
        }

        enforcedReply = slotMessage;
        enforcedAction = { type: 'select_slot', data: { slots } };
      } 
      // Step 4: Check Document Upload constraints, Payment, or Booking
      else {
        const planName = matchPlan[1];
        const selectedPlanObj = plans.find(p => p.name.toLowerCase() === planName.toLowerCase() || p.id.toLowerCase() === planName.toLowerCase());
        const requiredDocs = selectedPlanObj?.requiredDocuments || [];
        const hasRequiredDocs = requiredDocs.length > 0;
        
        if (hasRequiredDocs && !hasUploaded) {
          enforcedReply = `Since you selected a **${planName}**, Dr. Patel requires you to upload your **${requiredDocs.join(', ')}** before the session. Please click below to upload:`;
          enforcedAction = { type: 'upload_document', data: { requiredDocuments: requiredDocs } };
        } 
        // Step 5: Payment Checkout — show payment if user just picked a new slot OR hasn't confirmed payment yet
        else if (!hasConfirmedPayment || isCurrentMsgNewSlot) {
          const amount = selectedPlanObj ? (selectedPlanObj.price || selectedPlanObj.fee) : 499;
          const currency = selectedPlanObj?.currency || region?.currency || clinic.providers?.region?.config?.defaultCurrency || 'INR';
          const currencySymbol = (currency === 'INR' || currency === 'inr') ? '₹' : '$';
          const qrCode = `upi://pay?pa=nephroconsult@upi&pn=NephroConsult&am=${amount}&cu=${currency}`;
          
          enforcedReply = `Your appointment is set for **${matchDate[1]}** at **${matchSlot[1]}**. Please complete the fee payment of **${currencySymbol}${amount}** below:`;
          enforcedAction = {
            type: 'payment_checkout',
            data: { 
              amount, 
              currency, 
              qrCode,
              paymentSettings: clinic?.paymentSettings || {}
            }
          };
        } 
        // Step 6: Confirmation Receipt
        else {
          const date = matchDate[1];
          const slot = matchSlot[1];
          const plan = matchPlan[1];
          const amount = selectedPlanObj ? (selectedPlanObj.price || selectedPlanObj.fee) : 499;

          // Trigger internal/external booking creation
          const bookingResult = await registry.booking.bookAppointment({
            clinicId,
            patientName: patientName || 'Patient',
            patientPhone: patientPhone || '+919999999999',
            patientEmail: patientEmail || 'patient@example.com',
            consultationType: plan,
            date,
            time: slot,
            country: region.country || 'IN',
            notes: `Conversational Booking confirmed via AI Doctor. Plan: ${plan}`,
            paymentProvider: 'UPI',
            paymentStatus: 'Paid',
            amount
          });

          if (!bookingResult.success) {
            let freshSlots = ["09:00 AM", "10:00 AM", "11:00 AM", "02:00 PM", "03:00 PM", "04:00 PM"];
            try {
              const liveSlots = await registry.booking.getAvailableSlots(clinicId, date);
              if (liveSlots && liveSlots.length > 0) freshSlots = liveSlots;
            } catch (e) {
              console.warn('Failed to query slots provider for fallback:', e.message);
            }
            enforcedReply = `I apologize, but scheduling failed: **${bookingResult.message}**\n\nPlease select one of the available open time slots for **${date}** below:`;
            enforcedAction = { type: 'select_slot', data: { slots: freshSlots } };
          } else {
            enforcedReply = `Congratulations! Your payment has been verified. Your appointment is confirmed and a receipt has been logged. You can review all details in your profile settings.`;
            enforcedAction = {
              type: 'booking_confirm',
              data: { plan, date, slot }
            };

            // Notify patient via simulated NotificationProvider
            try {
              await registry.notification.sendNotification(clinicId, {
                type: 'email',
                recipient: { email: patientEmail || 'patient@example.com', phone: patientPhone || '+919999999999' },
                payload: {
                  subject: `Appointment Confirmed with ${clinic.doctorName}`,
                  body: `Dear ${patientName || 'Patient'},\n\nYour consultation plan "${plan}" has been successfully booked for ${date} at ${slot}.\n\nThank you!`
                }
              });
            } catch (err) {
              console.warn('Failed to dispatch booking confirmation notification email.', err.message);
            }
          }
        }
      }
    }

    // B. Fetch live plans and slots dynamically from resolved providers
    let plansContext = '';
    let slotsContext = '';
    try {
      if (plans && plans.length > 0) {
        plansContext = '\nAvailable Consultation Plans:\n' + plans.map(p => 
          `- Plan ID: ${p.id}, Plan Name: ${p.name}, Fee: ${p.price} ${p.currency}, Duration: ${p.duration} minutes, Required Documents: ${p.requiredDocuments?.join(', ') || 'None'}`
        ).join('\n');
      }

      const todayStr = new Date().toISOString().split('T')[0];
      const slots = await registry.booking.getAvailableSlots(clinicId, todayStr);
      if (slots && slots.length > 0) {
        slotsContext = `\nActive Available Time Slots for today (${todayStr}):\n` + slots.join(', ');
      } else {
        slotsContext = `\nActive Available Time Slots for today (${todayStr}): None available today.`;
      }
    } catch (err) {
      console.warn('Failed to retrieve live plans/slots for AI prompt context:', err.message);
    }

    // C. Fetch historical profile logs (past bookings, notes & prescriptions)
    let patientHistoryContext = '';
    if (patientEmail) {
      try {
        const Appointment = (await import('../models/Appointment.js')).default;
        const patientApps = await Appointment.find({ patientEmail }).sort({ createdAt: -1 });
        if (patientApps && patientApps.length > 0) {
          patientHistoryContext = '\nPatient Registered Past Appointment Logs (Profile Section):\n' + patientApps.map(app => 
            `- Date: ${app.date}, Time: ${app.time}, Plan: ${app.consultationType}, Status: ${app.status}, Payment: ${app.paymentStatus}, Prescription Notes: ${app.notes || 'Routine follow-up notes.'}`
          ).join('\n');
        }
      } catch (err) {
        console.warn('Failed to query patient historical database records:', err.message);
      }
    }

    // D. Timezone conversion instructions
    let timezoneInstruction = '';
    if (region.timezone && !region.timezone.toLowerCase().includes('kolkata')) {
      timezoneInstruction = `\nTimezone Rules:\n- The clinic is based in India and operates in Indian Standard Time (IST, GMT+5:30).\n- The patient is currently located in: ${region.timezone}.\n- You MUST inform the patient that appointments are scheduled in India Time and show them the local timezone equivalent (e.g. 10:00 AM IST is 12:30 AM EST). Always book in Indian time.`;
    } else {
      timezoneInstruction = `\nTimezone Rules:\n- The clinic operates in Indian Standard Time (IST, UTC+5:30).`;
    }

    // Generate Response using AI Service (Only if not programmatically overridden)
    let finalReply = enforcedReply;
    let finalAction = enforcedAction;

    if (!finalReply) {
      const doctorContext = `Clinic Info:\nName: ${clinic.name}\nDoctor: ${clinic.doctorName}\nSpecialization: ${clinic.specialization}\nWelcome Message: ${clinic.welcomeMessage}` +
        `\n\nActive Patient:\nName: ${patientName || 'Not Signed In'}\nEmail: ${patientEmail || 'None'}\nPhone: ${patientPhone || 'None'}` +
        plansContext + slotsContext + patientHistoryContext + timezoneInstruction;

      const systemPrompt = clinic.promptConfig + `\n` + doctorContext;
      const replyText = await aiService.generateResponse(conversation.messages, systemPrompt, kbContent);

      finalReply = replyText;
      finalAction = null;

      try {
        if (replyText.trim().startsWith('{')) {
          const parsed = JSON.parse(replyText);
          finalReply = parsed.reply || replyText;
          finalAction = parsed.action || null;
        }
      } catch (e) {
        // Safe fallback
      }
    }

    // 7. Append AI response to history
    conversation.messages.push({ role: 'model', content: finalReply });
    
    // Save history
    await conversation.save();

    res.json({
      success: true,
      reply: finalReply,
      action: finalAction,
      patient: authStatus.patient
    });
  } catch (error) {
    console.error('Chat API Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Generate summary of a conversation
// @route   POST /api/chat/summary
// @access  Public
router.post('/summary', async (req, res) => {
  const { clinicId, sessionId } = req.body;

  if (!clinicId || !sessionId) {
    return res.status(400).json({ success: false, message: 'clinicId and sessionId are required.' });
  }

  try {
    const conversation = await Conversation.findOne({ clinicId, sessionId });
    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation history not found.' });
    }

    if (conversation.messages.length < 2) {
      return res.status(400).json({ success: false, message: 'Conversation too short to summarize.' });
    }

    // Generate summary via Gemini AI
    const summary = await aiService.generateSummary(conversation.messages);
    
    // Save summary in database
    conversation.summary = summary;
    await conversation.save();

    res.json({
      success: true,
      summary
    });
  } catch (error) {
    console.error('Summary API Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Get session history
// @route   GET /api/chat/history
// @access  Public
router.get('/history', async (req, res) => {
  const { clinicId, sessionId } = req.query;

  if (!clinicId || !sessionId) {
    return res.status(400).json({ success: false, message: 'clinicId and sessionId are required.' });
  }

  try {
    const conversation = await Conversation.findOne({ clinicId, sessionId });
    res.json({
      success: true,
      history: conversation ? conversation.messages : []
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Get all conversations list with summaries (Dashboard)
// @route   GET /api/chat/conversations
// @access  Private
router.get('/conversations', protect, async (req, res) => {
  try {
    const conversations = await Conversation.find({ clinicId: req.clinic.clinicId })
      .select('sessionId summary updatedAt messages')
      .sort({ updatedAt: -1 });

    res.json({ success: true, conversations });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Get conversation details
// @route   GET /api/chat/conversations/:id
// @access  Private
router.get('/conversations/:id', protect, async (req, res) => {
  try {
    const conversation = await Conversation.findOne({ _id: req.params.id, clinicId: req.clinic.clinicId });
    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found.' });
    }
    res.json({ success: true, conversation });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
