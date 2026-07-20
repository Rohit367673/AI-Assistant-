import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './config/db.js';

// Route imports
import authRoutes from './routes/authRoutes.js';
import clinicRoutes from './routes/clinicRoutes.js';
import appointmentRoutes from './routes/appointmentRoutes.js';
import chatRoutes from './routes/chatRoutes.js';
import kbRoutes from './routes/kbRoutes.js';
import reportRoutes from './routes/reportRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import mockExternalServer from './routes/mockExternalServer.js';

dotenv.config();

// Connect to Database
connectDB();

const app = express();

// Standard middlewares
app.use(cors());
app.use(express.static('public')); // serve widget.js script statically
app.use(express.json({ limit: '10mb' })); // support logo uploading via base64
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health Check API
app.get('/', (req, res) => {
  res.json({
    status: 'Healthy',
    message: 'Multi-Tenant AI Healthcare Assistant SaaS API',
    timestamp: new Date()
  });
});

// Hook up route endpoints
app.use('/api/auth', authRoutes);
app.use('/api/clinic', clinicRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/chat', reportRoutes);
app.use('/api/kb', kbRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/mock-external', mockExternalServer);

// Global Error Handler Middleware
app.use((err, req, res, next) => {
  console.error('Unhandled server exception:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
});

const PORT = process.env.PORT || 5001;

app.listen(PORT, () => {
  console.log(`SaaS Backend Server started on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
});
