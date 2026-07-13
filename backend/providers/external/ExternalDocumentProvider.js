import DocumentProvider from '../base/DocumentProvider.js';
import axios from 'axios';

export default class ExternalDocumentProvider extends DocumentProvider {
  async uploadDocument({ buffer, originalname, mimetype, clinicId }) {
    const { webhookUrl, apiKey } = this.config;
    if (!webhookUrl) {
      throw new Error('External Document Provider: webhookUrl not configured.');
    }

    try {
      // Transfer using standard Base64 JSON payload
      const response = await axios.post(`${webhookUrl}/documents/upload`, {
        filename: originalname,
        mimetype,
        file: buffer.toString('base64'),
        clinicId
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey || ''}`
        }
      });
      return response.data;
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || error.message
      };
    }
  }
}
