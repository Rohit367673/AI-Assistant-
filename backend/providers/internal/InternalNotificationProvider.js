import NotificationProvider from '../base/NotificationProvider.js';

export default class InternalNotificationProvider extends NotificationProvider {
  async sendNotification({ clinicId, type, recipient, payload }) {
    console.log(`[Notification - Internal SaaS - ${clinicId}]`);
    console.log(`Type: ${type}`);
    console.log(`Recipient: ${JSON.stringify(recipient)}`);
    console.log(`Payload: ${JSON.stringify(payload)}`);
    console.log('------------------------------------------');
    
    return {
      success: true,
      message: `Notification simulated via Internal SaaS provider for: ${recipient.email || recipient.phone}`
    };
  }
}
