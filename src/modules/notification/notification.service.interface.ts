import { Notification, CreateNotificationInput } from './notification.model';

export interface INotificationService {
  create(input: CreateNotificationInput): Promise<Notification>;
  getById(id: string): Promise<Notification>;
  markRead(id: string): Promise<Notification>;
}
