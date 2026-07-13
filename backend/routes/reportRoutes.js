import express from 'express';
import multer from 'multer';
import Clinic from '../models/Clinic.js';
import kbService from '../services/kbService.js';
import aiService from '../services/aiService.js';
import ProviderRegistry from '../providers/ProviderRegistry.js';

const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 } // limit 5MB
});

// @desc    Analyze patient lab report
// @route   POST /api/chat/analyze-report
// @access  Public
router.post('/analyze-report', upload.single('file'), async (req, res) => {
  const { clinicId } = req.body;

  if (!clinicId) {
    return res.status(400).json({ success: false, message: 'clinicId is required to map the request.' });
  }

  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No file uploaded. Please upload a report file.' });
  }

  try {
    const clinic = await Clinic.findOne({ clinicId });
    if (!clinic) {
      return res.status(404).json({ success: false, message: 'Clinic not found.' });
    }

    // 1. Resolve and execute document upload provider
    const registry = await ProviderRegistry.resolveClinicProviders(clinicId);
    const uploadResult = await registry.document.uploadDocument({
      buffer: req.file.buffer,
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      clinicId
    });

    if (!uploadResult.success) {
      return res.status(400).json({ success: false, message: uploadResult.message || 'File upload failed.' });
    }

    // 2. Extract text from document buffer (PDF/DOCX/Text)
    const reportText = await kbService.parseDocument(req.file.buffer, req.file.mimetype);
    
    if (!reportText.trim()) {
      return res.status(400).json({ success: false, message: 'Could not extract readable text from the document.' });
    }

    // 3. Generate explanation using Gemini AI
    const analysis = await aiService.analyzeLabReport(reportText, {
      name: clinic.name,
      doctorName: clinic.doctorName
    });

    res.json({
      success: true,
      analysis,
      fileName: req.file.originalname,
      url: uploadResult.url
    });
  } catch (error) {
    console.error('Report analysis route error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
