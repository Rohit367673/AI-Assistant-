export default class RegionProvider {
  constructor(config = {}) {
    this.config = config;
  }

  // Returns: { country: string, currency: string, timezone: string, locale: string, language: string }
  async getPatientRegion(req) {
    throw new Error('getPatientRegion() not implemented');
  }
}
