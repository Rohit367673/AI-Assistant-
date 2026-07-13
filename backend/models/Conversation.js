import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  role: {
    type: String,
    enum: ['user', 'model'],
    required: true,
  },
  content: {
    type: String,
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  }
});

const conversationSchema = new mongoose.Schema({
  clinicId: {
    type: String,
    required: true,
    index: true,
  },
  sessionId: {
    type: String,
    required: true,
    index: true,
  },
  messages: [messageSchema],
  summary: {
    symptomsDiscussed: { type: [String], default: [] },
    patientConcerns: { type: [String], default: [] },
    questionsAsked: { type: [String], default: [] },
    suggestedAppointment: { type: Boolean, default: false },
    textSummary: { type: String, default: '' }
  }
}, { timestamps: true });

// Ensure compound index for unique sessions per clinic
conversationSchema.index({ clinicId: 1, sessionId: 1 }, { unique: true });

const Conversation = mongoose.model('Conversation', conversationSchema);
export default Conversation;
