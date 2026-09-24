import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it } from 'vitest';
import { Landing } from './landing';

describe('Landing', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ imports: [Landing], providers: [provideRouter([])] });
  });

  it('separates demo and administration access', () => {
    const fixture = TestBed.createComponent(Landing);
    fixture.detectChanges();
    const content = fixture.nativeElement.textContent as string;
    const links = Array.from(fixture.nativeElement.querySelectorAll('a')) as HTMLAnchorElement[];

    expect(content).toContain('Espace Démo');
    expect(content).toContain('Espace Administration');
    expect(links.some((link) => link.textContent?.includes('Accéder à la démo') && link.href.includes('/login?mode=demo'))).toBe(true);
    expect(links.some((link) => link.textContent?.includes('Connexion administrateur') && link.href.includes('/login?mode=admin'))).toBe(true);
  });

  it('offers the user space to an authenticated user', () => {
    localStorage.setItem('rendez_vous_access_token', 'header.payload.signature');
    localStorage.setItem('rendez_vous_current_user', JSON.stringify({ id: 2, email: 'user@example.com', firstName: 'User', lastName: 'Demo', roles: ['ROLE_USER'] }));
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ imports: [Landing], providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(Landing);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Accéder à mon espace');
  });

  it('offers the administration space to an authenticated admin', () => {
    localStorage.setItem('rendez_vous_access_token', 'header.payload.signature');
    localStorage.setItem('rendez_vous_current_user', JSON.stringify({ id: 1, email: 'admin@example.com', firstName: 'Admin', lastName: 'Demo', roles: ['ROLE_ADMIN'] }));
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ imports: [Landing], providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(Landing);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain("Accéder à l'administration");
  });
});
