export default class BookingProvider {
  constructor(config = {}) {
    this.config = config;
  }

  // Returns: { success: boolean, appointment: object, message: string }
  async bookAppointment(bookingData) {
    throw new Error('bookAppointment() not implemented');
  }

  // Returns: Array of slot strings (e.g. ['09:00', '10:00'])
  async getAvailableSlots(clinicId, date) {
    throw new Error('getAvailableSlots() not implemented');
  }
}
