import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Auth } from '../../core/services/auth';
import { Landing } from './landing';

describe('Landing', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    TestBed.configureTestingModule({ imports: [Landing], providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()] });
    vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
  });

  afterEach(() => { TestBed.inject(HttpTestingController).verify(); sessionStorage.clear(); });

  it('separates demo and administration access', () => {
    const fixture = TestBed.createComponent(Landing);
    fixture.detectChanges();
    const content = fixture.nativeElement.textContent as string;
    const links = Array.from(fixture.nativeElement.querySelectorAll('a')) as HTMLAnchorElement[];

    expect(content).toContain('Espace Démo');
    expect(content).toContain('Espace Administration');
    expect(content).toContain('Essayer la démo utilisateur');
    expect(content).toContain('Essayer la démo administrateur');
    expect(links.some((link) => link.textContent?.includes('Connexion réelle') && link.pathname === '/login')).toBe(true);
  });

  it.each([['utilisateur', 'USER', '/dashboard'], ['administrateur', 'ADMIN', '/admin']] as const)('opens the %s demo immediately without HTTP', (label, role, destination) => {
    const fixture = TestBed.createComponent(Landing);
    fixture.detectChanges();
    const button = Array.from(fixture.nativeElement.querySelectorAll('button')).find((item) => (item as HTMLButtonElement).textContent?.includes(`Essayer la démo ${label}`)) as HTMLButtonElement;
    button.click();
    const auth = TestBed.inject(Auth);
    expect(auth.isDemo()).toBe(true);
    expect(auth.isAuthenticated()).toBe(true);
    expect(auth.hasAnyRole([role])).toBe(true);
    expect(auth.getAccessToken()).toBeNull();
    expect(TestBed.inject(Router).navigateByUrl).toHaveBeenCalledWith(destination);
    TestBed.inject(HttpTestingController).expectNone(() => true);
  });

  it('offers the user space to an authenticated user', () => {
    localStorage.setItem('rendez_vous_access_token', 'header.payload.signature');
    localStorage.setItem('rendez_vous_current_user', JSON.stringify({ id: 2, email: 'user@example.com', firstName: 'User', lastName: 'Demo', roles: ['ROLE_USER'] }));
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ imports: [Landing], providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()] });
    const fixture = TestBed.createComponent(Landing);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Accéder à mon espace');
  });

  it('offers the administration space to an authenticated admin', () => {
    localStorage.setItem('rendez_vous_access_token', 'header.payload.signature');
    localStorage.setItem('rendez_vous_current_user', JSON.stringify({ id: 1, email: 'admin@example.com', firstName: 'Admin', lastName: 'Demo', roles: ['ROLE_ADMIN'] }));
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ imports: [Landing], providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()] });
    const fixture = TestBed.createComponent(Landing);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain("Accéder à l'administration");
  });
});
