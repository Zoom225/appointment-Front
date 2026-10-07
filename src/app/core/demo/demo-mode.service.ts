import { Injectable, computed, inject, signal } from '@angular/core';
import { DEMO_ADMIN, DEMO_USER } from './demo-data';
import { DemoStorageService } from './demo-storage.service';

export type ApplicationMode = 'REAL' | 'USER_DEMO' | 'ADMIN_DEMO';
export type DemoRole = 'USER' | 'ADMIN';

const DEMO_SESSION_KEY = 'rendez_vous_demo_session_v1';

/** A local demo identity is deliberately independent of the real JWT session. */
@Injectable({ providedIn: 'root' })
export class DemoModeService {
  private readonly storage = inject(DemoStorageService);
  private readonly modeSignal = signal<ApplicationMode>(this.restoreMode());

  readonly mode = this.modeSignal.asReadonly();
  readonly isDemo = computed(() => this.mode() !== 'REAL');
  readonly user = computed(() => {
    const identity = this.mode() === 'USER_DEMO' ? DEMO_USER : this.mode() === 'ADMIN_DEMO' ? DEMO_ADMIN : null;
    return identity ? { ...identity, roles: [...identity.roles] } : null;
  });

  activate(role: DemoRole): void {
    this.storage.read();
    const mode: ApplicationMode = role === 'ADMIN' ? 'ADMIN_DEMO' : 'USER_DEMO';
    try {
      sessionStorage.setItem(DEMO_SESSION_KEY, JSON.stringify({ version: 1, kind: 'DEMO', mode }));
    } catch {
      // Browsers which block storage can still use a demo for the current page lifetime.
    }
    this.modeSignal.set(mode);
  }

  resetDemo(): void {
    if (this.isDemo()) this.storage.resetDemo();
  }

  exit(): void {
    this.removeStoredSession();
    this.storage.clear();
    this.modeSignal.set('REAL');
  }

  private restoreMode(): ApplicationMode {
    try {
      const raw = sessionStorage.getItem(DEMO_SESSION_KEY);
      if (!raw) return 'REAL';
      const session: unknown = JSON.parse(raw);
      if (session && typeof session === 'object' && 'version' in session && session.version === 1 &&
          'kind' in session && session.kind === 'DEMO' && 'mode' in session &&
          (session.mode === 'USER_DEMO' || session.mode === 'ADMIN_DEMO')) {
        return session.mode;
      }
    } catch {
      // A damaged local demo session cannot authenticate a visitor.
    }

    this.removeStoredSession();
    return 'REAL';
  }

  private removeStoredSession(): void {
    try {
      sessionStorage.removeItem(DEMO_SESSION_KEY);
    } catch {
      // Storage access is optional; in-memory mode still exits immediately.
    }
  }
}
