import DocumentProvider from '../base/DocumentProvider.js';
import fs from 'fs';
import path from 'path';

export default class InternalDocumentProvider extends DocumentProvider {
  async uploadDocument({ buffer, originalname, mimetype, clinicId }) {
    try {
      const publicDir = path.resolve('public');
      const uploadsDir = path.join(publicDir, 'uploads');
      
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      const filename = `${Date.now()}_${originalname.replace(/\s+/g, '_')}`;
      const filePath = path.join(uploadsDir, filename);
      
      fs.writeFileSync(filePath, buffer);
      
      const fileUrl = `http://localhost:5001/uploads/${filename}`;
      return {
        success: true,
        url: fileUrl,
        key: `internal/${clinicId}/${filename}`
      };
    } catch (error) {
      console.error('Internal upload error:', error);
      return {
        success: false,
        message: error.message
      };
    }
  }
}
