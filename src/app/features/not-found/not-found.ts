import { Component } from '@angular/core';
import { ErrorPage } from '../../shared/components/error-page/error-page';

@Component({
  selector: 'app-not-found',
  imports: [ErrorPage],
  templateUrl: './not-found.html',
})
export class NotFound {}
