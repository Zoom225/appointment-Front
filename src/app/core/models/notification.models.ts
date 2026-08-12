export type NotificationType = 'CREATED' | 'UPDATED' | 'CANCELLED' | 'STATUS_CHANGED' | 'REMINDER';

export interface AppNotification {
  id: number;
  appointmentId: number | null;
  recipientId: number;
  type: NotificationType;
  title: string;
  message: string;
  createdAt: string;
  readAt: string | null;
}

export interface NotificationQuery {
  page?: number;
  size?: number;
  unreadOnly?: boolean;
  type?: NotificationType;
}
