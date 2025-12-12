import { supabase } from '../lib/supabase';
import { TBL } from '../config/tables';

class NotificationsService {
  constructor() {
    this.tableName = TBL.NOTIFICATIONS;
  }

  /**
   * Get all notifications with graceful error handling
   * @returns {Promise<Array>} Array of notifications
   */
  async getAllNotifications() {
    try {
      console.log(`🔧 Fetching notifications from ${this.tableName}`);
      
      const { data, error } = await supabase
        .from(this.tableName)
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.warn(`⚠️ Error fetching notifications from ${this.tableName}:`, error.message);
        // Return empty array instead of throwing to prevent UI breaks
        return [];
      }

      console.log(`✅ Successfully fetched ${data?.length || 0} notifications from ${this.tableName}`);
      return data || [];
    } catch (err) {
      console.warn(`⚠️ Exception fetching notifications from ${this.tableName}:`, err.message);
      // Return empty array instead of throwing to prevent UI breaks
      return [];
    }
  }

  /**
   * Get notification by ID
   * @param {string} notificationId - Notification ID
   * @returns {Promise<Object|null>} Notification object or null
   */
  async getNotificationById(notificationId) {
    try {
      console.log(`🔧 Fetching notification ${notificationId} from ${this.tableName}`);
      
      const { data, error } = await supabase
        .from(this.tableName)
        .select('*')
        .eq('id', notificationId)
        .single();

      if (error) {
        console.warn(`⚠️ Error fetching notification ${notificationId} from ${this.tableName}:`, error.message);
        return null;
      }

      console.log(`✅ Successfully fetched notification ${notificationId} from ${this.tableName}`);
      return data;
    } catch (err) {
      console.warn(`⚠️ Exception fetching notification ${notificationId} from ${this.tableName}:`, err.message);
      return null;
    }
  }

  /**
   * Create a new notification
   * @param {Object} notificationData - Notification data
   * @returns {Promise<Object|null>} Created notification or null
   */
  async createNotification(notificationData) {
    try {
      console.log(`🔧 Creating notification in ${this.tableName}:`, notificationData);
      
      const { data, error } = await supabase
        .from(this.tableName)
        .insert([{
          ...notificationData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) {
        console.warn(`⚠️ Error creating notification in ${this.tableName}:`, error.message);
        return null;
      }

      console.log(`✅ Successfully created notification in ${this.tableName}:`, data);
      return data;
    } catch (err) {
      console.warn(`⚠️ Exception creating notification in ${this.tableName}:`, err.message);
      return null;
    }
  }

  /**
   * Mark notification as read
   * @param {string} notificationId - Notification ID
   * @returns {Promise<Object|null>} Updated notification or null
   */
  async markAsRead(notificationId) {
    try {
      console.log(`🔧 Marking notification ${notificationId} as read in ${this.tableName}`);
      
      const { data, error } = await supabase
        .from(this.tableName)
        .update({
          read: true,
          read_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', notificationId)
        .select()
        .single();

      if (error) {
        console.warn(`⚠️ Error marking notification ${notificationId} as read in ${this.tableName}:`, error.message);
        return null;
      }

      console.log(`✅ Successfully marked notification ${notificationId} as read in ${this.tableName}`);
      return data;
    } catch (err) {
      console.warn(`⚠️ Exception marking notification ${notificationId} as read in ${this.tableName}:`, err.message);
      return null;
    }
  }

  /**
   * Get unread notifications count
   * @returns {Promise<number>} Count of unread notifications
   */
  async getUnreadCount() {
    try {
      console.log(`🔧 Getting unread notifications count from ${this.tableName}`);
      
      const { count, error } = await supabase
        .from(this.tableName)
        .select('*', { count: 'exact', head: true })
        .eq('read', false);

      if (error) {
        console.warn(`⚠️ Error getting unread count from ${this.tableName}:`, error.message);
        return 0;
      }

      console.log(`✅ Successfully got unread count from ${this.tableName}: ${count}`);
      return count || 0;
    } catch (err) {
      console.warn(`⚠️ Exception getting unread count from ${this.tableName}:`, err.message);
      return 0;
    }
  }
}

// Create singleton instance
const notificationsService = new NotificationsService();

// Export both named functions and default service
export const getAllNotifications = (...args) => notificationsService.getAllNotifications(...args);
export const getNotificationById = (...args) => notificationsService.getNotificationById(...args);
export const createNotification = (...args) => notificationsService.createNotification(...args);
export const markAsRead = (...args) => notificationsService.markAsRead(...args);
export const getUnreadCount = (...args) => notificationsService.getUnreadCount(...args);

export default {
  getAllNotifications,
  getNotificationById,
  createNotification,
  markAsRead,
  getUnreadCount,
};