import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { getApiErrorMessage } from '../../core/errors/api-error';
import { User } from '../../core/models/auth.models';
import { Auth } from '../../core/services/auth';
import { ProfileApi } from '../../core/services/profile-api';
import { PageHeader } from '../../shared/components/page-header/page-header';
import { StateCard } from '../../shared/components/state-card/state-card';

@Component({
  selector: 'app-profile',
  imports: [PageHeader, ReactiveFormsModule, StateCard],
  templateUrl: './profile.html',
  styleUrl: './profile.css',
})
export class Profile implements OnInit {
  private readonly auth = inject(Auth);
  private readonly formBuilder = inject(FormBuilder);
  private readonly profileApi = inject(ProfileApi);

  protected readonly profile = signal<User | null>(this.auth.user());
  protected readonly isLoading = signal(true);
  protected readonly isSaving = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly successMessage = signal<string | null>(null);

  protected readonly form = this.formBuilder.nonNullable.group({
    firstName: ['', [Validators.maxLength(80)]],
    lastName: ['', [Validators.maxLength(80)]],
  });

  ngOnInit(): void {
    this.profileApi.getProfile().subscribe({
      next: (profile) => {
        this.setProfile(profile);
        this.isLoading.set(false);
      },
      error: (error: unknown) => {
        this.errorMessage.set(getApiErrorMessage(error));
        this.isLoading.set(false);
      },
    });
  }

  protected saveProfile(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSaving.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    this.profileApi.updateProfile(this.form.getRawValue()).subscribe({
      next: (profile) => {
        this.setProfile(profile);
        this.successMessage.set('Profil mis à jour.');
        this.isSaving.set(false);
      },
      error: (error: unknown) => {
        this.errorMessage.set(getApiErrorMessage(error));
        this.isSaving.set(false);
      },
    });
  }

  private setProfile(profile: User): void {
    this.profile.set(profile);
    this.auth.updateCurrentUser(profile);
    this.form.patchValue({
      firstName: profile.firstName ?? '',
      lastName: profile.lastName ?? '',
    });
  }
}
