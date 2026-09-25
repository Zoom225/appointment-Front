import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize, timeout, timer } from 'rxjs';
import { getApiErrorMessage } from '../../../core/errors/api-error';
import { Auth } from '../../../core/services/auth';
import { SessionFeedback } from '../../../core/services/session-feedback';

type LoginState = 'idle' | 'loading' | 'slow' | 'success' | 'error';
type DemoMode = 'demo' | 'admin' | null;

const DEMO_CREDENTIALS = {
  demo: { email: 'demo.user@appointment.local', password: 'DemoUser2026!' },
  admin: { email: 'demo.admin@appointment.local', password: 'DemoAdmin2026!' },
} as const;

const SLOW_LOGIN_DELAY_MS = 3000;
const LOGIN_TIMEOUT_MS = 60000;
const RENDER_STARTUP_MESSAGE =
  "Le serveur démarre actuellement. Le premier chargement peut prendre entre 30 et 60 secondes car l'application est hébergée sur une offre gratuite.";

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  private readonly auth = inject(Auth);
  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);
  private readonly formBuilder = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly sessionFeedback = inject(SessionFeedback);
  protected readonly requestedMode: DemoMode = this.readRequestedMode();
  protected readonly demoCredentials = this.requestedMode ? DEMO_CREDENTIALS[this.requestedMode] : null;

  protected readonly pageTitle = this.requestedMode === 'admin'
    ? 'Connexion Administration'
    : this.requestedMode === 'demo'
      ? "Connexion à l'espace Démo"
      : 'Connexion';
  protected readonly pageDescription = this.requestedMode === 'admin'
    ? "Accès réservé à l'administration de la plateforme."
    : this.requestedMode === 'demo'
      ? 'Connectez-vous pour tester la prise de rendez-vous.'
      : 'Connectez-vous pour accéder à votre espace sécurisé.';

  protected readonly loginState = signal<LoginState>('idle');
  protected readonly isSubmitting = signal(false);
  protected readonly slowMessage = signal<string | null>(null);
  protected readonly errorMessage = signal<string | null>(
    this.sessionFeedback.message() ??
      (this.route.snapshot.queryParamMap.get('sessionExpired') ? 'Votre session a expiré. Connectez-vous à nouveau.' : null),
  );

  protected readonly form = this.formBuilder.nonNullable.group({
    email: [this.demoCredentials?.email ?? '', [Validators.required, Validators.email]],
    password: [this.demoCredentials?.password ?? '', [Validators.required, Validators.minLength(8)]],
  });

  protected fillDemoCredentials(): void {
    if (!this.demoCredentials || this.isSubmitting()) {
      return;
    }

    this.form.setValue(this.demoCredentials);
  }

  protected submit(): void {
    if (this.isSubmitting() || this.loginState() === 'success') {
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loginState.set('loading');
    this.isSubmitting.set(true);
    this.slowMessage.set(null);
    this.errorMessage.set(null);
    this.sessionFeedback.clear();

    timer(SLOW_LOGIN_DELAY_MS)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        if (this.loginState() === 'loading') {
          this.loginState.set('slow');
          this.slowMessage.set(RENDER_STARTUP_MESSAGE);
        }
      });

    this.auth
      .login(this.form.getRawValue())
      .pipe(
        timeout(LOGIN_TIMEOUT_MS),
        finalize(() => {
          this.isSubmitting.set(false);
          this.slowMessage.set(null);
        }),
      )
      .subscribe({
        next: () => {
          this.loginState.set('success');
          const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl')
            ?? (this.auth.hasAnyRole(['ADMIN']) ? '/admin' : '/dashboard');
          void this.router.navigateByUrl(returnUrl);
        },
        error: (error: unknown) => {
          this.loginState.set('error');
          this.errorMessage.set(
            getApiErrorMessage(error, { unauthorizedMessage: 'Email ou mot de passe incorrect' }),
          );
        },
      });
  }

  private readRequestedMode(): DemoMode {
    const mode = this.route.snapshot.queryParamMap.get('mode');
    return mode === 'demo' || mode === 'admin' ? mode : null;
  }
}
