import KnowledgeProvider from '../base/KnowledgeProvider.js';
import axios from 'axios';

export default class ExternalKnowledgeProvider extends KnowledgeProvider {
  async queryKnowledge(clinicId, queryText) {
    const { webhookUrl, apiKey } = this.config;
    if (!webhookUrl) return '';

    try {
      const response = await axios.get(`${webhookUrl}/knowledge/search`, {
        params: { clinicId, query: queryText },
        headers: {
          'Authorization': `Bearer ${apiKey || ''}`
        }
      });
      return response.data?.context || '';
    } catch (error) {
      console.error('External Knowledge Provider query failed:', error.message);
      return '';
    }
  }
}
