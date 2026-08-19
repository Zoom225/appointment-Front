import { Component, HostBinding, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Loading } from './core/services/loading';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly loading = inject(Loading);

  @HostBinding('class.app-loading')
  protected get isAppLoading(): boolean {
    return this.loading.isLoading();
  }
}
