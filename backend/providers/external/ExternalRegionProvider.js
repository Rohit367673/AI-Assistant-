import RegionProvider from '../base/RegionProvider.js';
import axios from 'axios';

export default class ExternalRegionProvider extends RegionProvider {
  async getPatientRegion(req) {
    const { webhookUrl, defaultRegion } = this.config;
    
    // Default fallback return structure
    const fallback = {
      country: defaultRegion?.country || 'US',
      currency: defaultRegion?.currency || 'USD',
      timezone: defaultRegion?.timezone || 'America/New_York',
      locale: 'en-US',
      language: 'en'
    };

    if (!webhookUrl) return fallback;

    try {
      const response = await axios.get(`${webhookUrl}/region`, {
        headers: {
          'x-forwarded-for': req?.headers?.['x-forwarded-for'] || '',
          'user-agent': req?.headers?.['user-agent'] || ''
        }
      });
      return response.data || fallback;
    } catch (error) {
      console.error('External Region Provider check failed, using fallback:', error.message);
      return fallback;
    }
  }
}
