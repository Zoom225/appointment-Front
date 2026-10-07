import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Auth } from '../../core/services/auth';
import { ConfirmDialog } from '../../shared/services/confirm-dialog';
import { MainLayout } from './main-layout';

describe('MainLayout space switch', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    localStorage.setItem('rendez_vous_access_token', 'header.payload.signature');
    localStorage.setItem('rendez_vous_current_user', JSON.stringify({ id: 2, email: 'demo.user@appointment.local', firstName: 'Demo', lastName: 'User', roles: ['ROLE_USER'] }));
    TestBed.configureTestingModule({
      imports: [MainLayout],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
  });

  afterEach(() => { TestBed.inject(HttpTestingController).verify(); sessionStorage.clear(); });

  it('confirms, logs out, clears the session and returns to the landing page', () => {
    const fixture = TestBed.createComponent(MainLayout);
    const component = fixture.componentInstance as any;
    const auth = TestBed.inject(Auth);
    const router = TestBed.inject(Router);
    vi.spyOn(TestBed.inject(ConfirmDialog), 'confirm').mockReturnValue(true);
    const logout = vi.spyOn(auth, 'logout');
    vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);

    component.changeSpace();

    expect(logout).toHaveBeenCalledWith({ redirect: false });
    expect(localStorage.getItem('rendez_vous_access_token')).toBeNull();
    expect(localStorage.getItem('rendez_vous_current_user')).toBeNull();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/');
  });

  it('shows the demo banner and resets the data with a fresh dashboard', async () => {
    const auth = TestBed.inject(Auth);
    const router = TestBed.inject(Router);
    vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
    auth.startDemo('USER');
    const reset = vi.spyOn(auth, 'resetDemo');
    const fixture = TestBed.createComponent(MainLayout);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Mode démo');
    expect(fixture.nativeElement.textContent).toContain('Demo Utilisateur');
    expect(fixture.nativeElement.textContent).toContain('Réinitialiser la démo');
    await (fixture.componentInstance as any).resetDemo();
    expect(reset).toHaveBeenCalledOnce();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/', { skipLocationChange: true });
    expect(router.navigateByUrl).toHaveBeenLastCalledWith('/dashboard');
    expect(auth.isDemo()).toBe(true);
    TestBed.inject(HttpTestingController).expectNone(() => true);
  });

  it('returns to the role choice when leaving a demo space without HTTP', () => {
    const auth = TestBed.inject(Auth);
    const router = TestBed.inject(Router);
    vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
    vi.spyOn(TestBed.inject(ConfirmDialog), 'confirm').mockReturnValue(true);
    auth.startDemo('ADMIN');
    const fixture = TestBed.createComponent(MainLayout);
    fixture.detectChanges();
    (fixture.componentInstance as any).changeSpace();
    expect(auth.isDemo()).toBe(false);
    expect(router.navigateByUrl).toHaveBeenLastCalledWith('/');
    TestBed.inject(HttpTestingController).expectNone(() => true);
  });
});
