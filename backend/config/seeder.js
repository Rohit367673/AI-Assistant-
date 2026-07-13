import Clinic from '../models/Clinic.js';

export const seedDefaultClinics = async () => {
  try {
    // 1. Mercer Clinic (General Medicine - Standalone Mode)
    const mercerExists = await Clinic.findOne({ clinicId: 'mercer-clinic' });
    if (!mercerExists || !mercerExists.providers) {
      console.log('Seeding default clinic workspace: mercer-clinic...');
      if (mercerExists) {
        await Clinic.deleteOne({ clinicId: 'mercer-clinic' });
      }

      const mercer = new Clinic({
        clinicId: 'mercer-clinic',
        email: 'mercer@clinic.com',
        password: 'password123',
        name: 'Mercer Medical Clinic',
        doctorName: 'Dr. Alex Mercer',
        specialization: 'General Medicine',
        logo: '',
        themeColor: '#6366f1',
        welcomeMessage: 'Hello! I am Dr. Mercer\'s AI Assistant. How can I help you today?',
        promptConfig: 'You are a warm, professional, and knowledgeable AI medical assistant for Dr. Alex Mercer. Help patients by explaining general health topics, disease prevention, and common remedies in a simple, friendly manner. Remind patients when needed that you are an educational resource and suggest they book an appointment for specific diagnoses.',
        businessHours: [
          { day: 'Monday', open: '09:00', close: '17:00', enabled: true },
          { day: 'Tuesday', open: '09:00', close: '17:00', enabled: true },
          { day: 'Wednesday', open: '09:00', close: '17:00', enabled: true },
          { day: 'Thursday', open: '09:00', close: '17:00', enabled: true },
          { day: 'Friday', open: '09:00', close: '17:00', enabled: true },
          { day: 'Saturday', open: '09:00', close: '13:00', enabled: true },
          { day: 'Sunday', open: '09:00', close: '12:00', enabled: false }
        ],
        appointmentSlots: ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30'],
        consultationTypes: [
          { name: 'General Consultation', fee: 50 },
          { name: 'Specialist Consultation', fee: 100 },
          { name: 'Follow-up Checkup', fee: 30 }
        ],
        paymentSettings: {
          qrCodeEnabled: true,
          qrValue: 'upi://pay?pa=mercer@upi&pn=MercerClinic&cu=INR',
          razorpayEnabled: false,
          stripeEnabled: false
        },
        subscriptionPlan: 'Starter',
        subscriptionStatus: 'Active',
        providers: {
          booking: { type: 'internal', config: {} },
          payment: { type: 'internal', config: {} },
          region: { type: 'internal', config: { defaultCountry: 'US', defaultCurrency: 'USD', defaultTimezone: 'America/New_York' } },
          consultation: { type: 'internal', config: {} },
          auth: { type: 'internal', config: {} },
          document: { type: 'internal', config: {} },
          notification: { type: 'internal', config: {} },
          knowledge: { type: 'internal', config: {} }
        }
      });
      await mercer.save();
      console.log('Successfully seeded default clinic workspace: mercer-clinic.');
    }

    // 2. NephroConsult (Nephrology Clinic - Integrated Mode)
    const nephroExists = await Clinic.findOne({ clinicId: 'nephroconsult' });
    if (!nephroExists || !nephroExists.providers) {
      console.log('Seeding default clinic workspace: nephroconsult...');
      if (nephroExists) {
        await Clinic.deleteOne({ clinicId: 'nephroconsult' });
      }

      const nephro = new Clinic({
        clinicId: 'nephroconsult',
        email: 'nephro@consult.com',
        password: 'password123',
        name: 'NephroConsult Kidney Specialist Clinic',
        doctorName: 'Dr. Rohit Patel',
        specialization: 'Nephrology & Kidney Care',
        logo: '',
        themeColor: '#7c3aed',
        welcomeMessage: 'Welcome to NephroConsult! I am your Kidney Health AI Assistant. Ask me anything about kidney health or select "Appointments" to schedule a booking.',
        promptConfig: 'You are an expert AI medical assistant for Dr. Rohit Patel at NephroConsult. You specialize in kidney health (nephrology), dialysis guidance, chronic kidney disease prevention, and dietary advice for renal care (reducing sodium, managing potassium, etc.). Always communicate empathetically. Remind patients when needed that you are an educational resource and suggest they book an appointment for specific clinical diagnoses.',
        businessHours: [
          { day: 'Monday', open: '09:00', close: '18:00', enabled: true },
          { day: 'Tuesday', open: '09:00', close: '18:00', enabled: true },
          { day: 'Wednesday', open: '09:00', close: '18:00', enabled: true },
          { day: 'Thursday', open: '09:00', close: '18:00', enabled: true },
          { day: 'Friday', open: '09:00', close: '18:00', enabled: true },
          { day: 'Saturday', open: '10:00', close: '14:00', enabled: true },
          { day: 'Sunday', open: '09:00', close: '12:00', enabled: false }
        ],
        appointmentSlots: ['09:00', '10:00', '11:00', '12:00', '14:00', '15:00', '16:00', '17:00'],
        consultationTypes: [
          { name: 'Nephrology Consultation', fee: 150 },
          { name: 'CKD Management & Checkup', fee: 200 },
          { name: 'Dialysis Session Booking', fee: 120 }
        ],
        paymentSettings: {
          qrCodeEnabled: true,
          qrValue: 'upi://pay?pa=nephro@upi&pn=NephroConsult&cu=INR',
          razorpayEnabled: false,
          stripeEnabled: false
        },
        subscriptionPlan: 'Professional',
        subscriptionStatus: 'Active',
        providers: {
          booking: { type: 'external', config: { webhookUrl: 'http://localhost:5001/api/mock-external', apiKey: 'nc_key_99' } },
          payment: { type: 'external', config: { webhookUrl: 'http://localhost:5001/api/mock-external', apiKey: 'nc_key_99' } },
          region: { type: 'external', config: { webhookUrl: 'http://localhost:5001/api/mock-external', apiKey: 'nc_key_99', defaultRegion: { country: 'IN', currency: 'INR', timezone: 'Asia/Kolkata' } } },
          consultation: { type: 'external', config: { webhookUrl: 'http://localhost:5001/api/mock-external', apiKey: 'nc_key_99' } },
          auth: { type: 'external', config: { webhookUrl: 'http://localhost:5001/api/mock-external', apiKey: 'nc_key_99' } },
          document: { type: 'external', config: { webhookUrl: 'http://localhost:5001/api/mock-external', apiKey: 'nc_key_99' } },
          notification: { type: 'external', config: { webhookUrl: 'http://localhost:5001/api/mock-external', apiKey: 'nc_key_99' } },
          knowledge: { type: 'external', config: { webhookUrl: 'http://localhost:5001/api/mock-external', apiKey: 'nc_key_99' } }
        }
      });
      await nephro.save();
      console.log('Successfully seeded default clinic workspace: nephroconsult.');
    }
  } catch (error) {
    console.error('Error seeding default clinics:', error);
  }
};
