export default class KnowledgeProvider {
  constructor(config = {}) {
    this.config = config;
  }

  // Returns: string context content
  async queryKnowledge(clinicId, queryText) {
    throw new Error('queryKnowledge() not implemented');
  }
}
