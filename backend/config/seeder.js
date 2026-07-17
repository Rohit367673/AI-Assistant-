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
        consultationTypes: [
          { name: 'Initial Consultation', fee: 499 },
          { name: 'Follow-up Consultation', fee: 399 },
          { name: 'Urgent Consultation', fee: 999 }
        ],
        paymentSettings: {
          qrCodeEnabled: true,
          qrValue: 'upi://pay?pa=nephroconsult@upi&pn=NephroConsult&cu=INR',
          razorpayEnabled: false,
          stripeEnabled: false
        },
        subscriptionPlan: 'Professional',
        subscriptionStatus: 'Active',
        providers: {
          booking: { type: 'internal', config: {} },
          payment: { type: 'internal', config: {} },
          region: { type: 'internal', config: { defaultCountry: 'IN', defaultCurrency: 'INR', defaultTimezone: 'Asia/Kolkata' } },
          consultation: { type: 'internal', config: {} },
          auth: { type: 'internal', config: {} },
          document: { type: 'internal', config: {} },
          notification: { type: 'internal', config: {} },
          knowledge: { type: 'internal', config: {} }
        }
      });
      await nephro.save();
      console.log('Successfully seeded default clinic workspace: nephroconsult.');
    }
  } catch (error) {
    console.error('Error seeding default clinics:', error);
  }
};
