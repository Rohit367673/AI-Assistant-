export default class AuthProvider {
  constructor(config = {}) {
    this.config = config;
  }

  // Returns: { authenticated: boolean, patient: object | null }
  async verifySession(token, clinicId) {
    throw new Error('verifySession() not implemented');
  }
}
