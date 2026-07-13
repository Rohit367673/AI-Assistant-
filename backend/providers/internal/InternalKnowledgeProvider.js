import KnowledgeProvider from '../base/KnowledgeProvider.js';
import kbService from '../../services/kbService.js';

export default class InternalKnowledgeProvider extends KnowledgeProvider {
  async queryKnowledge(clinicId, queryText) {
    return await kbService.queryKnowledgeBase(clinicId, queryText);
  }
}
