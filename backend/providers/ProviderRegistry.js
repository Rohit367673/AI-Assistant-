import Clinic from '../models/Clinic.js';

// Internal Provider Imports
import InternalBookingProvider from './internal/InternalBookingProvider.js';
import InternalPaymentProvider from './internal/InternalPaymentProvider.js';
import InternalRegionProvider from './internal/InternalRegionProvider.js';
import InternalConsultationProvider from './internal/InternalConsultationProvider.js';
import InternalAuthProvider from './internal/InternalAuthProvider.js';
import InternalDocumentProvider from './internal/InternalDocumentProvider.js';
import InternalNotificationProvider from './internal/InternalNotificationProvider.js';
import InternalKnowledgeProvider from './internal/InternalKnowledgeProvider.js';

// External Provider Imports
import ExternalBookingProvider from './external/ExternalBookingProvider.js';
import ExternalPaymentProvider from './external/ExternalPaymentProvider.js';
import ExternalRegionProvider from './external/ExternalRegionProvider.js';
import ExternalConsultationProvider from './external/ExternalConsultationProvider.js';
import ExternalAuthProvider from './external/ExternalAuthProvider.js';
import ExternalDocumentProvider from './external/ExternalDocumentProvider.js';
import ExternalNotificationProvider from './external/ExternalNotificationProvider.js';
import ExternalKnowledgeProvider from './external/ExternalKnowledgeProvider.js';

class ProviderRegistry {
  constructor() {
    this.instances = new Map();
  }

  async resolveClinicProviders(clinicId) {
    // Return cached instances if available to avoid DB lookups on every request
    if (this.instances.has(clinicId)) {
      return this.instances.get(clinicId);
    }

    const clinic = await Clinic.findOne({ clinicId });
    if (!clinic) {
      throw new Error(`Clinic workspace "${clinicId}" not found in system registry.`);
    }

    const resolved = {
      booking: this._createProvider(
        clinic.providers?.booking?.type,
        clinic.providers?.booking?.config,
        InternalBookingProvider,
        ExternalBookingProvider
      ),
      payment: this._createProvider(
        clinic.providers?.payment?.type,
        clinic.providers?.payment?.config,
        InternalPaymentProvider,
        ExternalPaymentProvider
      ),
      region: this._createProvider(
        clinic.providers?.region?.type,
        clinic.providers?.region?.config,
        InternalRegionProvider,
        ExternalRegionProvider
      ),
      consultation: this._createProvider(
        clinic.providers?.consultation?.type,
        clinic.providers?.consultation?.config,
        InternalConsultationProvider,
        ExternalConsultationProvider
      ),
      auth: this._createProvider(
        clinic.providers?.auth?.type,
        clinic.providers?.auth?.config,
        InternalAuthProvider,
        ExternalAuthProvider
      ),
      document: this._createProvider(
        clinic.providers?.document?.type,
        clinic.providers?.document?.config,
        InternalDocumentProvider,
        ExternalDocumentProvider
      ),
      notification: this._createProvider(
        clinic.providers?.notification?.type,
        clinic.providers?.notification?.config,
        InternalNotificationProvider,
        ExternalNotificationProvider
      ),
      knowledge: this._createProvider(
        clinic.providers?.knowledge?.type,
        clinic.providers?.knowledge?.config,
        InternalKnowledgeProvider,
        ExternalKnowledgeProvider
      )
    };

    this.instances.set(clinicId, resolved);
    return resolved;
  }

  _createProvider(type, config, InternalClass, ExternalClass) {
    const activeType = type || 'internal';
    const activeConfig = config || {};
    
    if (activeType === 'external') {
      return new ExternalClass(activeConfig);
    }
    return new InternalClass(activeConfig);
  }

  // Clear cache helper (e.g. when clinic settings are updated via Dashboard)
  clearCache(clinicId) {
    this.instances.delete(clinicId);
  }
}

const registry = new ProviderRegistry();
export default registry;
