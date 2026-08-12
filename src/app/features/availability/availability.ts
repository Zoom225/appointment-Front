import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { getApiErrorMessage } from '../../core/errors/api-error';
import { AppointmentAvailabilitySlot } from '../../core/models/appointment.models';
import { AppointmentsApi } from '../../core/services/appointments-api';
import { Auth } from '../../core/services/auth';
import { PageHeader } from '../../shared/components/page-header/page-header';
import { StateCard } from '../../shared/components/state-card/state-card';

@Component({
  selector: 'app-availability',
  imports: [DatePipe, PageHeader, ReactiveFormsModule, StateCard],
  templateUrl: './availability.html',
  styleUrl: './availability.css',
})
export class Availability {
  private readonly appointmentsApi = inject(AppointmentsApi);
  private readonly auth = inject(Auth);
  private readonly formBuilder = inject(FormBuilder);

  protected readonly slots = signal<AppointmentAvailabilitySlot[]>([]);
  protected readonly isLoading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly form = this.formBuilder.nonNullable.group({
    date: [new Date().toISOString().slice(0, 10), Validators.required],
  });

  protected search(): void {
    const userId = this.auth.user()?.id;

    if (!userId) {
      this.errorMessage.set('Utilisateur connecté introuvable.');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.appointmentsApi.getAvailability(userId, this.form.controls.date.value).subscribe({
      next: (slots) => {
        this.slots.set(slots);
        this.isLoading.set(false);
      },
      error: (error: unknown) => {
        this.errorMessage.set(getApiErrorMessage(error));
        this.isLoading.set(false);
      },
    });
  }

  protected formatDate(value: string): string {
    return new Intl.DateTimeFormat('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(new Date(value));
  }

  protected formatTime(value: string): string {
    return new Intl.DateTimeFormat('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(value));
  }
}
