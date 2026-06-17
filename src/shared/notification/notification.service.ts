export interface INotificationService {
  send(recipientId: string, type: string, title: string, body: string): Promise<void>;
}
