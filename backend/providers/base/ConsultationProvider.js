export default class ConsultationProvider {
  constructor(config = {}) {
    this.config = config;
  }

  // Returns: Array of plan objects
  async getPlans(clinicId) {
    throw new Error('getPlans() not implemented');
  }
}
