import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize, timer } from 'rxjs';
import { getApiErrorMessage } from '../../../core/errors/api-error';
import { Auth } from '../../../core/services/auth';
import { SessionFeedback } from '../../../core/services/session-feedback';

type LoginState = 'idle' | 'loading' | 'slow' | 'success' | 'error';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule],
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

  protected readonly loginState = signal<LoginState>('idle');
  protected readonly isSubmitting = signal(false);
  protected readonly slowMessage = signal<string | null>(null);
  protected readonly errorMessage = signal<string | null>(
    this.sessionFeedback.message() ??
      (this.route.snapshot.queryParamMap.get('sessionExpired')
        ? 'Ta session a expiré. Connecte-toi à nouveau.'
        : null),
  );

  protected readonly form = this.formBuilder.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
  });

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

    timer(3000)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        if (this.loginState() === 'loading') {
          this.loginState.set('slow');
          this.slowMessage.set('Le serveur démarre, cela peut prendre quelques secondes...');
        }
      });

    this.auth
      .login(this.form.getRawValue())
      .pipe(
        finalize(() => {
          this.isSubmitting.set(false);
          this.slowMessage.set(null);
        }),
      )
      .subscribe({
        next: () => {
          this.loginState.set('success');
          const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') ?? '/dashboard';
          void this.router.navigateByUrl(returnUrl);
        },
        error: (error: unknown) => {
          this.loginState.set('error');
          this.errorMessage.set(getApiErrorMessage(error));
        },
      });
  }
}
