import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { forkJoin, of } from 'rxjs';
import { getApiErrorMessage } from '../../core/errors/api-error';
import { Appointment } from '../../core/models/appointment.models';
import { AppUser } from '../../core/models/user.models';
import { AppointmentsApi } from '../../core/services/appointments-api';
import { Auth } from '../../core/services/auth';
import { UsersApi } from '../../core/services/users-api';
import { PageHeader } from '../../shared/components/page-header/page-header';
import { StateCard } from '../../shared/components/state-card/state-card';

@Component({
  selector: 'app-dashboard',
  imports: [PageHeader, StateCard],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard implements OnInit {
  private readonly appointmentsApi = inject(AppointmentsApi);
  private readonly auth = inject(Auth);
  private readonly usersApi = inject(UsersApi);

  protected readonly appointments = signal<Appointment[]>([]);
  protected readonly users = signal<AppUser[]>([]);
  protected readonly isLoading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly canViewUsers = computed(() => this.auth.hasAnyRole(['ADMIN']));
  protected readonly activeUsersCount = computed(() => this.users().filter((user) => user.isActive).length);
  protected readonly upcomingAppointmentsCount = computed(
    () => this.appointments().filter((appointment) => appointment.status !== 'cancelled').length,
  );

  ngOnInit(): void {
    forkJoin({
      appointments: this.appointmentsApi.findAll(),
      users: this.canViewUsers() ? this.usersApi.findAll() : of([]),
    }).subscribe({
      next: ({ appointments, users }) => {
        this.appointments.set(appointments);
        this.users.set(users);
        this.isLoading.set(false);
      },
      error: (error: unknown) => {
        this.errorMessage.set(getApiErrorMessage(error));
        this.isLoading.set(false);
      },
    });
  }
}
