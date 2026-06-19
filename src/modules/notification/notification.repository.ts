import { Notification } from './notification.model';

export interface INotificationRepository {
  create(notification: Omit<Notification, 'id' | 'createdAt'>): Promise<Notification>;
  update(notificationId: string, updates: Partial<Notification>): Promise<Notification>;
  findByRecipient(recipientId: string, options?: { isRead?: boolean; limit?: number }): Promise<Notification[]>;
  findById(notificationId: string): Promise<Notification | null>;
}

export class NotificationRepository implements INotificationRepository {
  private store: Map<string, Notification> = new Map();

  async create(notification: Omit<Notification, 'id' | 'createdAt'>): Promise<Notification> {
    const id = this.generateId();
    const newNotification: Notification = {
      ...notification,
      id,
      createdAt: new Date(),
    };
    this.store.set(id, newNotification);
    return newNotification;
  }

  async update(notificationId: string, updates: Partial<Notification>): Promise<Notification> {
    const existing = this.store.get(notificationId);
    if (!existing) {
      throw new Error(`Notification ${notificationId} not found`);
    }
    const updated: Notification = { ...existing, ...updates };
    this.store.set(notificationId, updated);
    return updated;
  }

  async findByRecipient(recipientId: string, options?: { isRead?: boolean; limit?: number }): Promise<Notification[]> {
    let results = Array.from(this.store.values()).filter(n => n.recipientId === recipientId);
    
    if (options?.isRead !== undefined) {
      results = results.filter(n => n.isRead === options.isRead);
    }
    
    results.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    
    if (options?.limit) {
      results = results.slice(0, options.limit);
    }
    
    return results;
  }

  async findById(notificationId: string): Promise<Notification | null> {
    return this.store.get(notificationId) ?? null;
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2, 15);
  }
}
