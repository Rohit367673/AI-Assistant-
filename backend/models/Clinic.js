import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const clinicSchema = new mongoose.Schema({
  clinicId: {
    type: String,
    required: true,
    unique: true,
    index: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
  },
  password: {
    type: String,
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  doctorName: {
    type: String,
    default: 'Dr. Alex Mercer',
  },
  specialization: {
    type: String,
    default: 'General Medicine',
  },
  logo: {
    type: String,
    default: '',
  },
  themeColor: {
    type: String,
    default: '#6366f1', // default indigo
  },
  welcomeMessage: {
    type: String,
    default: 'Hello! I am your AI Health Assistant. How can I help you today?',
  },
  promptConfig: {
    type: String,
    default: 'You are a warm, professional, and knowledgeable AI medical assistant. Help patients by explaining general health topics, disease prevention, and common remedies in a simple, friendly manner. Remind patients when needed that you are an educational resource and suggest they book an appointment for specific diagnoses.',
  },
  businessHours: [
    {
      day: { type: String, required: true }, // e.g. "Monday"
      open: { type: String, default: "09:00" },
      close: { type: String, default: "17:00" },
      enabled: { type: Boolean, default: true }
    }
  ],
  appointmentSlots: {
    type: [String],
    default: ["09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "14:00", "14:30", "15:00", "15:30", "16:00", "16:30"]
  },
  consultationTypes: {
    type: [{
      name: { type: String, required: true },
      fee: { type: Number, required: true }
    }],
    default: [
      { name: "General Consultation", fee: 50 },
      { name: "Specialist Consultation", fee: 100 },
      { name: "Follow-up Checkup", fee: 30 }
    ]
  },
  paymentSettings: {
    qrCodeEnabled: { type: Boolean, default: true },
    qrValue: { type: String, default: 'upi://pay?pa=clinic@upi&pn=ClinicAI&cu=INR' },
    cashfreeEnabled: { type: Boolean, default: false },
    cashfreeAppId: { type: String, default: '' },
    cashfreeSecretKey: { type: String, default: '' },
    cashfreeEnvironment: { type: String, enum: ['sandbox', 'production'], default: 'sandbox' },
    razorpayEnabled: { type: Boolean, default: false },
    stripeEnabled: { type: Boolean, default: false }
  },
  subscriptionPlan: {
    type: String,
    enum: ['Starter', 'Professional', 'Enterprise'],
    default: 'Starter'
  },
  subscriptionStatus: {
    type: String,
    enum: ['Active', 'Inactive', 'Suspended'],
    default: 'Active'
  },
  providers: {
    booking: {
      type: { type: String, enum: ['internal', 'external'], default: 'internal' },
      config: { type: mongoose.Schema.Types.Mixed, default: {} }
    },
    payment: {
      type: { type: String, enum: ['internal', 'external'], default: 'internal' },
      config: { type: mongoose.Schema.Types.Mixed, default: {} }
    },
    region: {
      type: { type: String, enum: ['internal', 'external'], default: 'internal' },
      config: { type: mongoose.Schema.Types.Mixed, default: {} }
    },
    consultation: {
      type: { type: String, enum: ['internal', 'external'], default: 'internal' },
      config: { type: mongoose.Schema.Types.Mixed, default: {} }
    },
    auth: {
      type: { type: String, enum: ['internal', 'external'], default: 'internal' },
      config: { type: mongoose.Schema.Types.Mixed, default: {} }
    },
    document: {
      type: { type: String, enum: ['internal', 'external'], default: 'internal' },
      config: { type: mongoose.Schema.Types.Mixed, default: {} }
    },
    notification: {
      type: { type: String, enum: ['internal', 'external'], default: 'internal' },
      config: { type: mongoose.Schema.Types.Mixed, default: {} }
    },
    knowledge: {
      type: { type: String, enum: ['internal', 'external'], default: 'internal' },
      config: { type: mongoose.Schema.Types.Mixed, default: {} }
    }
  }
}, { timestamps: true });

// Hash password before saving
clinicSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
clinicSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

const Clinic = mongoose.model('Clinic', clinicSchema);
export default Clinic;
