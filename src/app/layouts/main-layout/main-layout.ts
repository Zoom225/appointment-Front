import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Auth } from '../../core/services/auth';
import { Theme } from '../../core/services/theme';
import { MAIN_NAVIGATION, NavigationItem } from './navigation';

@Component({
  selector: 'app-main-layout',
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './main-layout.html',
  styleUrl: './main-layout.css',
})
export class MainLayout {
  protected readonly auth = inject(Auth);
  protected readonly theme = inject(Theme);
  protected readonly navigationItems = MAIN_NAVIGATION;
  protected readonly isMenuOpen = signal(false);
  protected readonly roleLabel = computed(() => this.auth.roles().map((role) => role.replace('ROLE_', '')).join(', '));

  protected canShowNavigationItem(item: NavigationItem): boolean {
    return item.roles ? this.auth.hasAnyRole(item.roles) : true;
  }

  protected toggleMenu(): void {
    this.isMenuOpen.update((open) => !open);
  }

  protected closeMenu(): void {
    this.isMenuOpen.set(false);
  }
}
