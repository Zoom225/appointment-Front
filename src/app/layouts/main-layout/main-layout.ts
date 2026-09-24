import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Auth } from '../../core/services/auth';
import { Theme } from '../../core/services/theme';
import { NotificationsApi } from '../../core/services/notifications-api';
import { ConfirmDialog } from '../../shared/services/confirm-dialog';
import { ADMIN_NAVIGATION, NavigationItem, USER_NAVIGATION } from './navigation';

@Component({
  selector: 'app-main-layout',
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './main-layout.html',
  styleUrl: './main-layout.css',
})
export class MainLayout implements OnInit {
  protected readonly auth = inject(Auth);
  protected readonly theme = inject(Theme);
  private readonly notificationsApi = inject(NotificationsApi);
  private readonly confirmDialog = inject(ConfirmDialog);
  private readonly router = inject(Router);
  protected readonly isMenuOpen = signal(false);
  protected readonly unreadNotifications = signal(0);
  protected readonly isAdmin = computed(() => this.auth.hasAnyRole(['ADMIN']));
  protected readonly navigationItems = computed<NavigationItem[]>(() =>
    this.isAdmin() ? ADMIN_NAVIGATION : USER_NAVIGATION,
  );
  protected readonly roleLabel = computed(() => (this.isAdmin() ? 'Administrateur' : 'Utilisateur'));

  ngOnInit(): void {
    this.notificationsApi.findAll({ page: 0, size: 1, unreadOnly: true }).subscribe({
      next: (response) => this.unreadNotifications.set(response.totalElements),
      error: () => this.unreadNotifications.set(0),
    });
  }

  protected toggleMenu(): void {
    this.isMenuOpen.update((open) => !open);
  }

  protected closeMenu(): void {
    this.isMenuOpen.set(false);
  }

  protected changeSpace(): void {
    if (!this.confirmDialog.confirm('Voulez-vous quitter cet espace et choisir un autre compte ?')) {
      return;
    }

    this.auth.logout({ redirect: false });
    void this.router.navigateByUrl('/');
  }
}
