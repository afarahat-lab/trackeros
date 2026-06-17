export interface Yong {
  id: string;
  message: string;
  createdAt: Date;
  status: 'INITIALIZED' | 'ACTIVE' | 'ARCHIVED';
}
