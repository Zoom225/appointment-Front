import { Component, OnInit, inject, signal } from '@angular/core';
import { getApiErrorMessage } from '../../core/errors/api-error';
import { AppUser } from '../../core/models/user.models';
import { UsersApi } from '../../core/services/users-api';
import { PageHeader } from '../../shared/components/page-header/page-header';
import { StateCard } from '../../shared/components/state-card/state-card';

@Component({
  selector: 'app-users',
  imports: [PageHeader, StateCard],
  templateUrl: './users.html',
  styleUrl: './users.css',
})
export class Users implements OnInit {
  private readonly usersApi = inject(UsersApi);

  protected readonly users = signal<AppUser[]>([]);
  protected readonly isLoading = signal(true);
  protected readonly pendingUserId = signal<string | null>(null);
  protected readonly errorMessage = signal<string | null>(null);

  ngOnInit(): void {
    this.usersApi.findAll().subscribe({
      next: (users) => {
        this.users.set(users);
        this.isLoading.set(false);
      },
      error: (error: unknown) => {
        this.errorMessage.set(getApiErrorMessage(error));
        this.isLoading.set(false);
      },
    });
  }

  protected toggleUserStatus(user: AppUser): void {
    this.pendingUserId.set(user.id);
    this.usersApi.updateStatus(user.id, !user.isActive).subscribe({
      next: (updatedUser) => {
        this.users.update((users) =>
          users.map((currentUser) => (currentUser.id === updatedUser.id ? updatedUser : currentUser)),
        );
        this.pendingUserId.set(null);
      },
      error: (error: unknown) => {
        this.errorMessage.set(getApiErrorMessage(error));
        this.pendingUserId.set(null);
      },
    });
  }
}
