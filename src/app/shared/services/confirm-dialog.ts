import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ConfirmDialog {
  confirm(message: string): boolean {
    return window.confirm(message);
  }
}
