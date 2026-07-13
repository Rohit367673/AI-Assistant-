import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { seedDefaultClinics } from './seeder.js';

dotenv.config();

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
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
