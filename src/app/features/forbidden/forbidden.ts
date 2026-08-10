import { Component, inject } from '@angular/core';
import { ErrorPage } from '../../shared/components/error-page/error-page';
import { SessionFeedback } from '../../core/services/session-feedback';

@Component({
  selector: 'app-forbidden',
  imports: [ErrorPage],
  templateUrl: './forbidden.html',
})
export class Forbidden {
  private readonly sessionFeedback = inject(SessionFeedback);

  protected readonly description =
    this.sessionFeedback.message() ??
    "Ton compte ne dispose pas des autorisations nécessaires pour accéder à cette page.";
}
