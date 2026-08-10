import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Auth } from '../../core/services/auth';
import { MAIN_NAVIGATION, NavigationItem } from './navigation';

@Component({
  selector: 'app-main-layout',
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './main-layout.html',
  styleUrl: './main-layout.css',
})
export class MainLayout {
  protected readonly auth = inject(Auth);
  protected readonly navigationItems = MAIN_NAVIGATION;

  protected canShowNavigationItem(item: NavigationItem): boolean {
    return item.roles ? this.auth.hasAnyRole(item.roles) : true;
  }
}
