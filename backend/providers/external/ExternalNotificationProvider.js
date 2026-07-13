import NotificationProvider from '../base/NotificationProvider.js';
import axios from 'axios';

export default class ExternalNotificationProvider extends NotificationProvider {
  async sendNotification(notificationData) {
    const { webhookUrl, apiKey } = this.config;
    if (!webhookUrl) {
      console.log('External notification skipped: webhookUrl not configured.');
      return { success: true };
    }

    try {
      const response = await axios.post(`${webhookUrl}/notifications/send`, notificationData, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey || ''}`
        }
      });
      return response.data;
    } catch (error) {
      console.error('External Notification Provider error:', error.message);
      return {
        success: false,
        message: error.message
      };
    }
  }
}
