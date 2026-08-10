import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { getApiErrorMessage } from '../../../core/errors/api-error';
import { Auth } from '../../../core/services/auth';
import { SessionFeedback } from '../../../core/services/session-feedback';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  private readonly auth = inject(Auth);
  private readonly route = inject(ActivatedRoute);
  private readonly formBuilder = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly sessionFeedback = inject(SessionFeedback);

  protected readonly isSubmitting = signal(false);
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
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set(null);
    this.sessionFeedback.clear();

    this.auth.login(this.form.getRawValue()).subscribe({
      next: () => {
        const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') ?? '/dashboard';
        void this.router.navigateByUrl(returnUrl);
      },
      error: (error: unknown) => {
        this.errorMessage.set(getApiErrorMessage(error));
        this.isSubmitting.set(false);
      },
    });
  }
}
