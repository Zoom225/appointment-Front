import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Auth } from '../../core/services/auth';
import { ConfirmDialog } from '../../shared/services/confirm-dialog';
import { MainLayout } from './main-layout';

describe('MainLayout space switch', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('rendez_vous_access_token', 'header.payload.signature');
    localStorage.setItem('rendez_vous_current_user', JSON.stringify({ id: 2, email: 'demo.user@appointment.local', firstName: 'Demo', lastName: 'User', roles: ['ROLE_USER'] }));
    TestBed.configureTestingModule({
      imports: [MainLayout],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
  });

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
});
