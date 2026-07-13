import ConsultationProvider from '../base/ConsultationProvider.js';
import Clinic from '../../models/Clinic.js';

export default class InternalConsultationProvider extends ConsultationProvider {
  async getPlans(clinicId) {
    try {
      const clinic = await Clinic.findOne({ clinicId });
      if (!clinic) return [];

      return (clinic.consultationTypes || []).map(plan => ({
        id: plan._id ? plan._id.toString() : plan.name.toLowerCase().replace(/\s+/g, '-'),
        name: plan.name,
        description: `Simulated plan for ${plan.name} at ${clinic.name}.`,
        duration: 30,
        price: plan.fee,
        currency: clinic.currency || 'USD',
        requiredDocuments: plan.name.toLowerCase().includes('specialist') ? ['Lab Report'] : []
      }));
    } catch (error) {
      console.error('Error fetching internal plans:', error);
      return [];
    }
  }
}
