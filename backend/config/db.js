import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { seedDefaultClinics } from './seeder.js';
import Clinic from '../models/Clinic.js';

dotenv.config();

const runDatabaseMigration = async () => {
  console.log('Running database pricing and provider migration...');
  const targetIds = ['nephroconsult', 'nephroconsult-test'];
  
  for (const clinicId of targetIds) {
    try {
      const clinic = await Clinic.findOne({ clinicId });
      if (clinic) {
        // 1. Update plans to correct website values
        clinic.consultationTypes = [
          { name: 'Initial Consultation', fee: 499 },
          { name: 'Follow-up Consultation', fee: 399 },
          { name: 'Urgent Consultation', fee: 999 }
        ];
        
        // 2. Update payment settings to match NephroConsult VPA
        clinic.paymentSettings = {
          qrCodeEnabled: true,
          qrValue: 'upi://pay?pa=nephroconsult@upi&pn=NephroConsult&cu=INR',
          razorpayEnabled: false,
          stripeEnabled: false
        };
        
        // 3. Set all providers to internal so changes can be managed from Admin Dashboard Settings tab
        clinic.providers = {
          booking: { type: 'internal', config: {} },
          payment: { type: 'internal', config: {} },
          region: { type: 'internal', config: { defaultCountry: 'IN', defaultCurrency: 'INR', defaultTimezone: 'Asia/Kolkata' } },
          consultation: { type: 'internal', config: {} },
          auth: { type: 'internal', config: {} },
          document: { type: 'internal', config: {} },
          notification: { type: 'internal', config: {} },
          knowledge: { type: 'internal', config: {} }
        };
        
        // Mark modified explicitly since providers is a mixed type
        clinic.markModified('providers');
        clinic.markModified('paymentSettings');
        clinic.markModified('consultationTypes');
        
        await clinic.save();
        console.log(`Successfully migrated workspace database records for: ${clinicId}`);
      }
    } catch (err) {
      console.error(`Migration failed for clinic: ${clinicId}:`, err.message);
    }
  }
};

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    
    // Run database patch updates to ensure correct pricing and internal providers
    await runDatabaseMigration();

    // Run DB automatic seeder only if explicitly configured in environment variables
    if (process.env.SEED_DB === 'true') {
      await seedDefaultClinics();
    }
  } catch (error) {
    console.error(`Database connection error: ${error.message}`);
    process.exit(1);
  }
};

export default connectDB;
