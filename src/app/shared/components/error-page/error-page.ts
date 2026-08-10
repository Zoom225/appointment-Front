import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PageHeader } from '../page-header/page-header';

@Component({
  selector: 'app-error-page',
  imports: [PageHeader, RouterLink],
  templateUrl: './error-page.html',
  styleUrl: './error-page.css',
})
export class ErrorPage {
  readonly eyebrow = input.required<string>();
  readonly title = input.required<string>();
  readonly description = input.required<string>();
  readonly linkLabel = input('Retour au tableau de bord');
  readonly linkTo = input('/dashboard');
}
