import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { API_ENDPOINTS } from '../../../core/api/api-endpoints';
import { Login } from './login';

describe('Login', () => {
  let httpMock: HttpTestingController;
  let router: Router;
  let queryParams: Record<string, string>;

  beforeEach(() => {
    localStorage.clear();
    queryParams = {};
    vi.useFakeTimers();
    TestBed.configureTestingModule({
      imports: [Login],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: { get: (key: string) => convertToParamMap(queryParams).get(key) } } } },
      ],
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

  it('uses admin mode for presentation only and redirects a USER to the user dashboard', () => {
    queryParams = { mode: 'admin' };
    const fixture = TestBed.createComponent(Login);
    const component = fixture.componentInstance as any;
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Connexion Administration');
    component.form.setValue({ email: 'user@example.com', password: 'Password1!' });
    component.submit();
    httpMock.expectOne(API_ENDPOINTS.auth.login).flush({ id: 2, email: 'user@example.com', firstName: 'User', lastName: 'Demo', message: 'OK', roles: ['ROLE_USER'], token: 'header.payload.signature' });
    expect(router.navigateByUrl).toHaveBeenCalledWith('/dashboard');
    fixture.destroy();
  });

  it('redirects an authenticated ADMIN to the administration dashboard', () => {
    queryParams = { mode: 'admin' };
    const fixture = TestBed.createComponent(Login);
    const component = fixture.componentInstance as any;
    component.form.setValue({ email: 'admin@example.com', password: 'Password1!' });
    component.submit();
    httpMock.expectOne(API_ENDPOINTS.auth.login).flush({ id: 1, email: 'admin@example.com', firstName: 'Admin', lastName: 'Demo', message: 'OK', roles: ['ROLE_ADMIN'], token: 'header.payload.signature' });
    expect(router.navigateByUrl).toHaveBeenCalledWith('/admin');
    fixture.destroy();
  });

  it('shows and fills the public USER demo credentials without auto-login', () => {
    queryParams = { mode: 'demo' };
    const fixture = TestBed.createComponent(Login);
    const component = fixture.componentInstance as any;
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('demo.user@appointment.local');
    expect(fixture.nativeElement.textContent).toContain('DemoUser2026!');
    httpMock.expectNone(API_ENDPOINTS.auth.login);
    component.fillDemoCredentials();
    expect(component.form.getRawValue()).toEqual({ email: 'demo.user@appointment.local', password: 'DemoUser2026!' });
    expect(router.navigateByUrl).not.toHaveBeenCalled();
    const links = Array.from(fixture.nativeElement.querySelectorAll('a')) as HTMLAnchorElement[];
    expect(links.some((link) => link.textContent?.includes("Passer à l'espace Administration") && link.href.includes('mode=admin'))).toBe(true);
    expect(links.some((link) => link.textContent?.includes("Retour à l'accueil") && link.pathname === '/')).toBe(true);
    fixture.destroy();
  });

  it('shows and fills the public ADMIN demo credentials without auto-login', () => {
    queryParams = { mode: 'admin' };
    const fixture = TestBed.createComponent(Login);
    const component = fixture.componentInstance as any;
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('demo.admin@appointment.local');
    expect(fixture.nativeElement.textContent).toContain('DemoAdmin2026!');
    httpMock.expectNone(API_ENDPOINTS.auth.login);
    component.fillDemoCredentials();
    expect(component.form.getRawValue()).toEqual({ email: 'demo.admin@appointment.local', password: 'DemoAdmin2026!' });
    const links = Array.from(fixture.nativeElement.querySelectorAll('a')) as HTMLAnchorElement[];
    expect(links.some((link) => link.textContent?.includes("Passer à l'espace Utilisateur") && link.href.includes('mode=demo'))).toBe(true);
    fixture.destroy();
  });
});
