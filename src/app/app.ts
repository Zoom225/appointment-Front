import { Component, HostBinding, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Loading } from './core/services/loading';
import { Theme } from './core/services/theme';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly loading = inject(Loading);
  protected readonly theme = inject(Theme);

  @HostBinding('class.app-loading')
  protected get isAppLoading(): boolean {
    return this.loading.isLoading();
  }

  @HostBinding('class.light-theme')
  protected get isLightTheme(): boolean {
    return this.theme.mode() === 'light';
  }

  @HostBinding('class.dark-theme')
  protected get isDarkTheme(): boolean {
    return this.theme.mode() === 'dark';
  }
}
