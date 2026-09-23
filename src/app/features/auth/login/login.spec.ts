import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { API_ENDPOINTS } from '../../../core/api/api-endpoints';
import { Login } from './login';

describe('Login', () => {
  let httpMock: HttpTestingController;
  let router: Router;

  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
    TestBed.configureTestingModule({
      imports: [Login],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
  });

  afterEach(() => {
    httpMock.verify();
    vi.useRealTimers();
  });

  it('shows the expected credentials message on a login 401 without navigating', () => {
    const fixture = TestBed.createComponent(Login);
    const component = fixture.componentInstance as unknown as {
      form: { setValue(value: { email: string; password: string }): void };
      submit(): void;
      errorMessage(): string | null;
    };

    component.form.setValue({ email: 'user@example.com', password: 'Password1!' });
    component.submit();
    httpMock.expectOne(API_ENDPOINTS.auth.login).flush(
      { message: 'Unauthorized' },
      { status: 401, statusText: 'Unauthorized' },
    );

    expect(component.errorMessage()).toBe('Email ou mot de passe incorrect');
    expect(router.navigateByUrl).not.toHaveBeenCalled();
    fixture.destroy();
  });
});
