import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class SessionFeedback {
  private readonly messageSignal = signal<string | null>(null);

  readonly message = this.messageSignal.asReadonly();

  setSessionExpired(): void {
    this.messageSignal.set('Ta session a expiré. Connecte-toi à nouveau.');
  }

  setAccessDenied(): void {
    this.messageSignal.set("Tu n'as pas les droits nécessaires pour accéder à cette page.");
  }

  clear(): void {
    this.messageSignal.set(null);
  }
}
