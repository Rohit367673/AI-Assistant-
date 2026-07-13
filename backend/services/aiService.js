import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

// Extensible Base AI Service class
class BaseAIService {
  async generateResponse(messages, systemInstruction, kbContext) {
    throw new Error('generateResponse not implemented');
  }
  async generateSummary(messages) {
    throw new Error('generateSummary not implemented');
  }
  async generateEmbedding(text) {
    throw new Error('generateEmbedding not implemented');
  }
}

// Gemini Implementation
class GeminiAIService extends BaseAIService {
  constructor() {
    super();
    const apiKey = process.env.GEMINI_API_KEY;
    this.isMock = !apiKey || apiKey === 'YOUR_GEMINI_API_KEY' || apiKey.trim() === '';
    
    if (this.isMock) {
      console.warn('WARNING: GEMINI_API_KEY is not configured or is placeholder. AI Service running in DEMO mode with mock responses.');
    } else {
      this.genAI = new GoogleGenerativeAI(apiKey);
    }
  }

  async generateResponse(messages, systemInstruction, kbContext = '') {
    if (this.isMock) {
      return this.getMockResponse(messages, systemInstruction, kbContext);
    }

    try {
      // Use gemini-2.5-flash for speed and reliability
      const structuredInstruction = `${systemInstruction}
\n\nClinic Knowledge Base reference:
${kbContext}

Strict Health Disclaimer: Do not diagnose or prescribe. Provide educational guidance. Advise booking an appointment for specific diagnoses.

CONVERSATIONAL APPOINTMENT BOOKING INSTRUCTIONS:
If the user wants to book or schedule, or is selecting details, you MUST respond in JSON format matching this schema:
{
  "reply": "your conversation response to the user",
  "action": {
    "type": "select_plan" | "select_date" | "select_slot" | "upload_document" | "payment_checkout" | "booking_confirm",
    "data": {}
  }
}
If it is a general advice question or greeting, return a standard text message.`;

      const model = this.genAI.getGenerativeModel({ 
        model: 'gemini-2.5-flash',
        systemInstruction: structuredInstruction
      });

      // Map messages from schema to Gemini format
      const contents = messages.map(msg => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }]
      }));

      const result = await model.generateContent({ contents });
      const response = await result.response;
      const text = response.text().trim();
      
      try {
        if (text.startsWith('{')) {
          return text;
        }
        return JSON.stringify({ reply: text, action: null });
      } catch {
        return JSON.stringify({ reply: text, action: null });
      }
    } catch (error) {
      console.error('Gemini API generateResponse error:', error);
      return JSON.stringify({ 
        reply: `Let me guide you on that. As an AI health assistant, I recommend booking a physical checkup with our doctor for detailed diagnosis.`, 
        action: null 
      });
    }
  }

  async generateSummary(messages) {
    if (this.isMock) {
      return {
        symptomsDiscussed: ['General health inquiry', 'Fatigue/General checkup'],
        patientConcerns: ['Needs consultation', 'General wellness advise'],
        questionsAsked: ['How can I book an appointment?', 'What are the charges?'],
        suggestedAppointment: true,
        textSummary: 'Patient inquired about clinic services and checked options. The AI guided them on basic wellness and suggested scheduling a physical review.'
      };
    }

    try {
      const model = this.genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
      const conversationText = messages.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n');
      
      const prompt = `
      Analyze the following patient-doctor conversation and extract a JSON summary.
      You MUST respond ONLY with a valid JSON object matching this schema:
      {
        "symptomsDiscussed": ["symptom1", "symptom2"],
        "patientConcerns": ["concern1", "concern2"],
        "questionsAsked": ["question1", "question2"],
        "suggestedAppointment": true/false,
        "textSummary": "paragraph summarizing the interaction"
      }

      Conversation:
      ${conversationText}
      `;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      let text = response.text().trim();
      
      // Clean markdown code blocks if returned
      if (text.startsWith('```json')) {
        text = text.substring(7, text.length - 3);
      } else if (text.startsWith('```')) {
        text = text.substring(3, text.length - 3);
      }
      
      return JSON.parse(text.trim());
    } catch (error) {
      console.error('Gemini API generateSummary error:', error);
      return {
        symptomsDiscussed: ['Could not parse'],
        patientConcerns: ['Error parsing summary'],
        questionsAsked: [],
        suggestedAppointment: true,
        textSummary: 'Summary failed to generate automatically due to model parsing exception.'
      };
    }
  }

  async generateEmbedding(text) {
    if (this.isMock) {
      // Return a random 768-dimensional vector
      return Array.from({ length: 768 }, () => Math.random() * 2 - 1);
    }

    try {
      const model = this.genAI.getGenerativeModel({ model: 'text-embedding-004' });
      const result = await model.embedContent(text);
      return result.embedding.values;
    } catch (error) {
      console.error('Gemini API generateEmbedding error:', error);
      // Fallback vector
      return Array.from({ length: 768 }, () => 0);
    }
  }

  async analyzeLabReport(reportText, doctorConfig) {
    if (this.isMock) {
      return `### Lab Report Educational Breakdown
*   **Observation**: The uploaded document details metabolic and renal indicators.
*   **eGFR & Creatinine**: Creatinine is at 1.1 mg/dL, and eGFR is 78 mL/min/1.73m². This suggests mild clearance reductions, which is common and stable, but requires observation.
*   **Precautions**: Keep daily hydration consistent (2L+), limit heavy sodium/processed foods, and avoid NSAID pain relievers (like ibuprofen) which can stress kidneys.
*   **Disclaimer**: This analysis is for educational purposes only and does not substitute for a professional diagnosis. Please schedule an appointment with **${doctorConfig.doctorName}** at our clinic for a formal clinical review.`;
    }

    try {
      const model = this.genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
      const prompt = `
      You are a helpful AI medical assistant at "${doctorConfig.name}" assisting doctor ${doctorConfig.doctorName}.
      The patient has uploaded a lab report or health document. Explain the results, terminology, and standard ranges in simple, patient-friendly language.
      Include basic precautions and healthy recommendations when appropriate.

      STRICT GUIDELINES:
      - NEVER issue a formal diagnosis.
      - NEVER prescribe treatment or drugs.
      - ALWAYS include a prominent disclaimer stating this is educational information and they should consult ${doctorConfig.doctorName} at our clinic.

      Lab Report:
      ${reportText}
      `;
      const result = await model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error('Gemini API analyzeLabReport error:', error);
      return "I encountered an error analyzing the report content. Please review the document with our clinic staff.";
    }
  }

  // Fallback demo mock logic
  getMockResponse(messages, systemInstruction, kbContext) {
    const historyText = messages.map(m => m.content).join(' | ');
    const lastMsg = messages[messages.length - 1]?.content || '';
    const lastMsgLower = lastMsg.toLowerCase();

    // 1. Check if patient is confirming payment
    if (historyText.includes('[Confirm Payment') || lastMsgLower.includes('confirm payment') || lastMsgLower.includes('paid') || lastMsgLower.includes('verify')) {
      const matchSlot = historyText.match(/\[Selected Slot:\s*([^\]]+)\]/);
      const matchDate = historyText.match(/\[Selected Date:\s*([^\]]+)\]/);
      const matchPlan = historyText.match(/\[Selected Plan:\s*([^\]]+)\]/);
      return JSON.stringify({
        reply: "Congratulations! Your payment has been verified. I have booked your appointment and sent a confirmation alert to your contact channels.",
        action: {
          type: "booking_confirm",
          data: {
            plan: matchPlan ? matchPlan[1] : 'Specialist Consultation',
            date: matchDate ? matchDate[1] : '2026-07-20',
            slot: matchSlot ? matchSlot[1] : '10:00 AM'
          }
        }
      });
    }

    // 2. Check if they selected a slot
    if (historyText.includes('[Selected Slot:') || lastMsgLower.includes('select slot')) {
      const matchPlan = historyText.match(/\[Selected Plan:\s*([^\]]+)\]/);
      const isNephro = matchPlan && matchPlan[1].toLowerCase().includes('nephro');
      
      // Check if document uploaded
      const hasUploaded = historyText.includes('[Uploaded Document:');
      
      if (isNephro && !hasUploaded) {
        return JSON.stringify({
          reply: "Since you chose Nephrology Consultation, Dr. Patel requires you to upload your **Lab Report** before the session. Please upload your document below:",
          action: {
            type: "upload_document",
            data: {
              requiredDocuments: ["Lab Report"]
            }
          }
        });
      }

      // Proceed to checkout
      return JSON.stringify({
        reply: "Your appointment details are set. Please scan the QR code below or use the payment link to complete the booking:",
        action: {
          type: "payment_checkout",
          data: {
            amount: isNephro ? 1500 : 50,
            currency: isNephro ? 'INR' : 'USD',
            qrCode: isNephro ? 'upi://pay?pa=nephro@upi&pn=NephroConsult&am=1500&cu=INR' : 'upi://pay?pa=mercer@upi&pn=MercerClinic&cu=INR'
          }
        }
      });
    }

    // 3. Check if document uploaded (but no payment done yet)
    if (historyText.includes('[Uploaded Document:') && !historyText.includes('[Confirm Payment')) {
      const matchPlan = historyText.match(/\[Selected Plan:\s*([^\]]+)\]/);
      const isNephro = matchPlan && matchPlan[1].toLowerCase().includes('nephro');
      return JSON.stringify({
        reply: "Thank you, report uploaded successfully! I have analyzed it. Now, please complete the payment using this QR code to finalize your slot booking:",
        action: {
          type: "payment_checkout",
          data: {
            amount: isNephro ? 1500 : 50,
            currency: isNephro ? 'INR' : 'USD',
            qrCode: isNephro ? 'upi://pay?pa=nephro@upi&pn=NephroConsult&am=1500&cu=INR' : 'upi://pay?pa=mercer@upi&pn=MercerClinic&cu=INR'
          }
        }
      });
    }

    // 4. Check if they selected a date
    if (historyText.includes('[Selected Date:') || lastMsgLower.includes('select date')) {
      const matchDate = historyText.match(/\[Selected Date:\s*([^\]]+)\]/);
      return JSON.stringify({
        reply: `Excellent. Here are the available time slots for Monday, ${matchDate ? matchDate[1] : 'Date'}. Please select one:`,
        action: {
          type: "select_slot",
          data: {
            slots: ["09:00 AM", "10:00 AM", "11:00 AM", "02:00 PM", "03:00 PM", "04:00 PM"]
          }
        }
      });
    }

    // 5. Check if they selected a plan
    if (historyText.includes('[Selected Plan:') || lastMsgLower.includes('select plan')) {
      return JSON.stringify({
        reply: "Great choice. Please pick a preferred date for your session from the calendar strip:",
        action: {
          type: "select_date",
          data: {}
        }
      });
    }

    // 6. Check if they want to book
    if (lastMsgLower.includes('book') || lastMsgLower.includes('appointment') || lastMsgLower.includes('schedule') || lastMsgLower.includes('slot')) {
      return JSON.stringify({
        reply: "I can absolutely assist you with scheduling your appointment. Please select one of our clinic consultation plans below:",
        action: {
          type: "select_plan",
          data: {}
        }
      });
    }

    // Default conversational responses wrapped as JSON
    if (lastMsgLower.includes('hello') || lastMsgLower.includes('hi ') || lastMsgLower.includes('hey')) {
      return JSON.stringify({
        reply: "Hello! I am the clinic's AI health assistant. I can help explain kidney care, wellness tips, or walk you through booking an appointment. How can I assist you today?",
        action: null
      });
    }

    if (lastMsgLower.includes('headache') || lastMsgLower.includes('pain') || lastMsgLower.includes('fever') || lastMsgLower.includes('cough')) {
      return JSON.stringify({
        reply: "I understand you might be experiencing some symptoms. For minor symptoms, resting, staying hydrated, and avoiding strenuous tasks can help. However, please note that I cannot diagnose conditions or prescribe medications. If your symptoms persist or worsen, I highly recommend booking an appointment with our clinic doctor for a complete physical exam.",
        action: null
      });
    }

    return JSON.stringify({
      reply: "Thank you for sharing that. As your AI educational assistant, I can provide general information on that topic, but for specific medical advice regarding your condition, it's best to consult our doctor. Would you like to schedule an appointment with us?",
      action: null
    });
  }
}

// Easily exportable factory pattern for future extensions (e.g. OpenAI)
const getAIService = () => {
  // Can expand to read from database / environment for active provider
  return new GeminiAIService();
};

export default getAIService();
