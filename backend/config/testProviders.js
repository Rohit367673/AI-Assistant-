import mongoose from 'mongoose';
import dotenv from 'dotenv';
import ProviderRegistry from '../providers/ProviderRegistry.js';
import Clinic from '../models/Clinic.js';
import { seedDefaultClinics } from './seeder.js';

dotenv.config();

const runTests = async () => {
  try {
    console.log('Connecting to database...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/aidoctor');
    console.log('Connected.');

    // Force seed default clinics to ensure latest provider configs exist
    console.log('Re-initializing seeder records to ensure fresh provider mappings...');
    await Clinic.deleteMany({ clinicId: { $in: ['mercer-clinic', 'nephroconsult'] } });
    await seedDefaultClinics();

    const clinics = ['mercer-clinic', 'nephroconsult'];

    for (const clinicId of clinics) {
      console.log('\n==================================================');
      console.log(`TESTING WORKSPACE ID: "${clinicId}"`);
      console.log('==================================================');

      const registry = await ProviderRegistry.resolveClinicProviders(clinicId);

      // 1. Region Provider
      console.log('\n[1] Testing Region Provider...');
      const mockReq = { headers: { 'accept-language': 'en-GB,en;q=0.9' } };
      const region = await registry.region.getPatientRegion(mockReq);
      console.log('Result:', region);

      // 2. Consultation Provider
      console.log('\n[2] Testing Consultation Provider...');
      const plans = await registry.consultation.getPlans(clinicId);
      console.log('Result (Plans Count):', plans.length);
      console.log('First Plan:', plans[0]);

      // 3. Slot Provider / Booking Available Slots
      console.log('\n[3] Testing Available Slots...');
      const slots = await registry.booking.getAvailableSlots(clinicId, '2026-07-20');
      console.log('Result (Slots Count):', slots.length);
      console.log('Available Slots:', slots.slice(0, 5));

      // 4. Auth Provider
      console.log('\n[4] Testing Auth Provider...');
      const auth = await registry.auth.verifySession(null, clinicId);
      console.log('Guest Auth Session:', auth);

      // 5. Payment Provider
      console.log('\n[5] Testing Payment Provider...');
      const payment = await registry.payment.createPayment({
        clinicId,
        amount: 150,
        currency: region.currency,
        description: 'Renal Specialist Checkup'
      });
      console.log('Payment Link:', payment.paymentLink);
      console.log('QR Code:', payment.qrCode);
      console.log('Transaction ID:', payment.transactionId);

      // 6. Booking Provider
      console.log('\n[6] Testing Booking Provider...');
      const booking = await registry.booking.bookAppointment({
        clinicId,
        patientName: 'Jane Doe',
        patientPhone: '+1 555-9081',
        patientEmail: 'jane.doe@example.com',
        consultationType: plans[0]?.name || 'General Consultation',
        date: '2026-07-20',
        time: slots[0] || '10:00',
        country: region.country,
        notes: 'Simulated diagnostic review',
        paymentProvider: 'UPI QR',
        paymentStatus: 'Paid'
      });
      console.log('Booking Success:', booking.success);
      console.log('Appointment ID:', booking.appointment?.id || booking.appointment?._id);

      // 7. Notification Provider
      console.log('\n[7] Testing Notification Provider...');
      const notification = await registry.notification.sendNotification({
        clinicId,
        type: 'booking_confirm',
        recipient: { email: 'jane.doe@example.com', phone: '+1 555-9081' },
        payload: { date: '2026-07-20', time: '10:00' }
      });
      console.log('Notification Dispatch Status:', notification.success);

      // 8. Document Provider
      console.log('\n[8] Testing Document Provider...');
      const dummyBuffer = Buffer.from('Patient lab diagnostics test record content.');
      const document = await registry.document.uploadDocument({
        buffer: dummyBuffer,
        originalname: 'blood_panel.txt',
        mimetype: 'text/plain',
        clinicId
      });
      console.log('Uploaded Doc URL:', document.url);
      console.log('Uploaded Doc Key:', document.key);

      // 9. Knowledge Provider
      console.log('\n[9] Testing Knowledge Provider...');
      const context = await registry.knowledge.queryKnowledge(clinicId, 'dialysis food guidelines');
      console.log('RAG Matches Context Snippet:', context.slice(0, 150));
    }

    console.log('\n==================================================');
    console.log('ALL PROVIDER TESTS COMPLETED SUCCESSFULLY!');
    console.log('==================================================');
    process.exit(0);
  } catch (error) {
    console.error('Test execution error:', error);
    process.exit(1);
  }
};

runTests();
