import express from 'express';
import multer from 'multer';
import kbService from '../services/kbService.js';
import KnowledgeBase from '../models/KnowledgeBase.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Multer memory storage configuration
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 } // limit 5MB
});

// @desc    Upload file to knowledge base
// @route   POST /api/kb/upload
// @access  Private
router.post('/upload', protect, upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'Please upload a PDF, DOCX, or text file.' });
  }

  const clinicId = req.clinic.clinicId;
  const fileName = req.file.originalname;
  const mimeType = req.file.mimetype;
  const buffer = req.file.buffer;

  try {
    // Check constraints depending on subscription
    // Starter: limit to 1 file
    if (req.clinic.subscriptionPlan === 'Starter') {
      const distinctDocs = await KnowledgeBase.distinct('fileName', { clinicId });
      if (distinctDocs.length >= 1 && !distinctDocs.includes(fileName)) {
        return res.status(400).json({
          success: false,
          message: 'Starter Plan limit reached (maximum 1 file). Please upgrade to Professional or Enterprise.'
        });
      }
    } else if (req.clinic.subscriptionPlan === 'Professional') {
      const distinctDocs = await KnowledgeBase.distinct('fileName', { clinicId });
      if (distinctDocs.length >= 10 && !distinctDocs.includes(fileName)) {
        return res.status(400).json({
          success: false,
          message: 'Professional Plan limit reached (maximum 10 files). Please upgrade to Enterprise.'
        });
      }
    }

    // Process file
    const chunksCreated = await kbService.addDocument(clinicId, fileName, buffer, mimeType);

    res.json({
      success: true,
      message: `Successfully processed document. Created ${chunksCreated} index chunks.`,
      document: {
        fileName,
        chunks: chunksCreated
      }
    });
  } catch (error) {
    console.error('KB upload router error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Get all unique document filenames uploaded by clinic
// @route   GET /api/kb/documents
// @access  Private
router.get('/documents', protect, async (req, res) => {
  const clinicId = req.clinic.clinicId;

  try {
    // MongoDB aggregation to list distinct documents with count of chunks
    const documents = await KnowledgeBase.aggregate([
      { $match: { clinicId } },
      { $group: { _id: '$fileName', chunkCount: { $sum: 1 }, uploadedAt: { $max: '$createdAt' } } },
      { $project: { fileName: '$_id', chunkCount: 1, uploadedAt: 1, _id: 0 } },
      { $sort: { uploadedAt: -1 } }
    ]);

    res.json({ success: true, documents });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Delete a document from KB
// @route   DELETE /api/kb/documents/:fileName
// @access  Private
router.delete('/documents/:fileName', protect, async (req, res) => {
  const clinicId = req.clinic.clinicId;
  const fileName = req.params.fileName;

  try {
    await kbService.deleteDocument(clinicId, fileName);
    res.json({ success: true, message: `Document '${fileName}' deleted from knowledge base.` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
