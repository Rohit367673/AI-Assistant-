export default class NotificationProvider {
  constructor(config = {}) {
    this.config = config;
  }

  // Returns: { success: boolean }
  async sendNotification(notificationData) {
    throw new Error('sendNotification() not implemented');
  }
}
