import { Component } from '@angular/core';
import { ErrorPage } from '../../shared/components/error-page/error-page';

@Component({
  selector: 'app-forbidden',
  imports: [ErrorPage],
  templateUrl: './forbidden.html',
})
export class Forbidden {}
