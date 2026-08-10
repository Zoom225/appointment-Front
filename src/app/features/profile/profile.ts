import { Component, OnInit, inject, signal } from '@angular/core';
import { User } from '../../core/models/auth.models';
import { ProfileApi } from '../../core/services/profile-api';
import { PageHeader } from '../../shared/components/page-header/page-header';
import { StateCard } from '../../shared/components/state-card/state-card';

@Component({
  selector: 'app-profile',
  imports: [PageHeader, StateCard],
  templateUrl: './profile.html',
  styleUrl: './profile.css',
})
export class Profile implements OnInit {
  private readonly profileApi = inject(ProfileApi);

  protected readonly profile = signal<User | null>(null);
  protected readonly isLoading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);

  ngOnInit(): void {
    this.profileApi.getProfile().subscribe({
      next: (profile) => {
        this.profile.set(profile);
        this.isLoading.set(false);
      },
      error: () => {
        this.errorMessage.set('Impossible de charger le profil pour le moment.');
        this.isLoading.set(false);
      },
    });
  }
}
