import RegionProvider from '../base/RegionProvider.js';

export default class InternalRegionProvider extends RegionProvider {
  async getPatientRegion(req) {
    // Basic heuristics using headers/browser queries
    const acceptLanguage = req?.headers?.['accept-language'] || 'en-IN';
    const locale = acceptLanguage.split(',')[0];
    const language = locale.split('-')[0];
    const cfCountry = req?.headers?.['cf-ipcountry'];
    const isIndia = cfCountry === 'IN' || locale.includes('IN') || (this.config.defaultCountry === 'IN');

    return {
      country: isIndia ? 'IN' : (this.config.defaultCountry || 'IN'),
      currency: isIndia ? 'INR' : (this.config.defaultCurrency || 'INR'),
      timezone: isIndia ? 'Asia/Kolkata' : (this.config.defaultTimezone || 'Asia/Kolkata'),
      locale,
      language
    };
  }
}
