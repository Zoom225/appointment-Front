import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { getApiErrorMessage } from '../../core/errors/api-error';
import { AppNotification } from '../../core/models/notification.models';
import { NotificationsApi } from '../../core/services/notifications-api';
import { PageHeader } from '../../shared/components/page-header/page-header';
import { StateCard } from '../../shared/components/state-card/state-card';

@Component({
  selector: 'app-notifications',
  imports: [DatePipe, PageHeader, StateCard],
  templateUrl: './notifications.html',
  styleUrl: './notifications.css',
})
export class Notifications implements OnInit {
  private readonly notificationsApi = inject(NotificationsApi);

  protected readonly notifications = signal<AppNotification[]>([]);
  protected readonly isLoading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);

  ngOnInit(): void {
    this.loadNotifications();
  }

  protected markAsRead(notification: AppNotification): void {
    this.notificationsApi.markAsRead(notification.id).subscribe({
      next: (updatedNotification) => {
        this.notifications.update((items) =>
          items.map((item) => (item.id === updatedNotification.id ? updatedNotification : item)),
        );
      },
      error: (error: unknown) => {
        this.errorMessage.set(getApiErrorMessage(error));
      },
    });
  }

  private loadNotifications(): void {
    this.notificationsApi.findAll({ page: 0, size: 20 }).subscribe({
      next: (response) => {
        this.notifications.set(response.content);
        this.isLoading.set(false);
      },
      error: (error: unknown) => {
        this.errorMessage.set(getApiErrorMessage(error));
        this.isLoading.set(false);
      },
    });
  }
}
