import ConsultationProvider from '../base/ConsultationProvider.js';
import axios from 'axios';

export default class ExternalConsultationProvider extends ConsultationProvider {
  async getPlans(clinicId) {
    const { webhookUrl, apiKey } = this.config;
    if (!webhookUrl) return [];

    try {
      const response = await axios.get(`${webhookUrl}/plans`, {
        params: { clinicId },
        headers: {
          'Authorization': `Bearer ${apiKey || ''}`
        }
      });
      return response.data?.plans || [];
    } catch (error) {
      console.error('External Consultation Provider getPlans error:', error.message);
      return [];
    }
  }
}
