import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { routes } from '../../app.routes';
import { formatLocalDateInput } from '../date-time/local-date-time';
import { authInterceptor } from '../interceptors/auth.interceptor';
import { loadingInterceptor } from '../interceptors/loading.interceptor';
import { Auth } from '../services/auth';
import { demoNetworkInterceptor } from './demo-network.interceptor';

describe('Local demo through the real application routes', () => {
  let harness: RouterTestingHarness;
  let http: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    TestBed.configureTestingModule({ providers: [
      provideRouter(routes),
      provideHttpClient(withInterceptors([demoNetworkInterceptor, loadingInterceptor, authInterceptor])),
      provideHttpClientTesting(),
    ] });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.expectNone(() => true);
    http.verify();
    sessionStorage.clear();
    localStorage.clear();
  });

  const content = () => harness.routeNativeElement!.textContent!;

  async function click(label: string): Promise<void> {
    const button = Array.from(harness.routeNativeElement!.querySelectorAll('button'))
      .find((item) => item.textContent?.trim() === label);
    expect(button, `Button ${label}`).toBeTruthy();
    expect(button!.disabled).toBe(false);
    button!.click();
    await harness.fixture.whenStable();
    harness.detectChanges();
  }

  function fill(selector: string, value: string): void {
    const input = harness.routeNativeElement!.querySelector<HTMLInputElement | HTMLTextAreaElement>(selector)!;
    expect(input).toBeTruthy();
    input.value = value;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    harness.detectChanges();
  }

  it('books, handles the active appointment, cancels, confirms and keeps history entirely locally', async () => {
    harness = await RouterTestingHarness.create('/');
    await click('Essayer la démo utilisateur');
    expect(TestBed.inject(Router).url).toBe('/dashboard');
    expect(content()).toContain('Demo Utilisateur');
    expect(content()).toContain('Historique récent');
    expect(content()).toContain('Mode démo');

    await harness.navigateByUrl('/appointments/new');
    fill('#contact-first-name', 'Demo');
    fill('#contact-last-name', 'Utilisateur');
    fill('#contact-email', 'visiteur@demo.example');
    fill('#appointment-reason', 'Réservation depuis le portfolio');
    const date = new Date();
    date.setDate(date.getDate() + 14);
    while ([0, 6].includes(date.getDay())) date.setDate(date.getDate() + 1);
    fill('#appointment-date', formatLocalDateInput(date));
    await click('09:00 - 09:30');
    await click('Confirmer mon rendez-vous');
    expect(content()).toContain('Vous avez déjà un rendez-vous actif');

    await click('Annuler mon rendez-vous');
    await click('Annuler le rendez-vous');
    await click('09:00 - 09:30');
    await click('Confirmer mon rendez-vous');
    expect(content()).toContain('Votre rendez-vous est confirmé.');
    expect(content()).toContain('DEMO-RDV-');
    expect(content()).toContain("Envoi de l'email de confirmation...");
    const emailRequest = http.expectOne('/api/demo/send-confirmation');
    expect(emailRequest.request.method).toBe('POST');
    expect(emailRequest.request.headers.has('Authorization')).toBe(false);
    emailRequest.flush({ sent: true });
    harness.detectChanges();
    expect(content()).toContain('Un email de confirmation contenant votre QR code a été envoyé');

    await harness.navigateByUrl('/appointments');
    expect(content()).toContain('Réservation depuis le portfolio');
    await harness.navigateByUrl('/appointments/history');
    expect(content()).toContain('Découverte du service');
    await harness.navigateByUrl('/profile');
    expect(content()).toContain('Demo');
    expect(content()).toContain('Utilisateur');
    await harness.navigateByUrl('/notifications');
    expect(content()).toContain('Nouveau rendez-vous');

    await click('Réinitialiser la démo');
    expect(TestBed.inject(Router).url).toBe('/dashboard');
    expect(content()).toContain('Découverte du service');
    expect(content()).not.toContain('Réservation depuis le portfolio');
    await click('Déconnexion');
    expect(TestBed.inject(Router).url).toBe('/');
    expect(TestBed.inject(Auth).isAuthenticated()).toBe(false);
  });

  it('navigates every admin view and applies an admin status locally', async () => {
    harness = await RouterTestingHarness.create('/');
    await click('Essayer la démo administrateur');
    expect(TestBed.inject(Router).url).toBe('/admin');
    expect(content()).toContain('Demo Administrateur');
    expect(content()).toContain('Confirmés');
    expect(content()).toContain('Prochains rendez-vous confirmés');
    await harness.navigateByUrl('/admin/appointments');
    await click('Terminer');
    expect(content()).toContain('Terminé');
    await harness.navigateByUrl('/admin/appointments/history');
    expect(content()).toContain('Bilan du mois');
    await harness.navigateByUrl('/admin/users');
    expect(content()).toContain('Alice');
    await harness.navigateByUrl('/notifications');
    expect(content()).toContain('Rendez-vous terminé');
    await click('Marquer comme lue');
    expect(content()).toContain('Déjà lue');
    await harness.navigateByUrl('/profile');
    expect(content()).toContain('Administrateur');
    await click('Déconnexion');
    expect(TestBed.inject(Router).url).toBe('/');
  });

  it('uses the existing guards for local user permissions and guest redirection', async () => {
    harness = await RouterTestingHarness.create('/');
    await click('Essayer la démo utilisateur');
    await harness.navigateByUrl('/login');
    expect(TestBed.inject(Router).url).toBe('/dashboard');
    await harness.navigateByUrl('/admin');
    expect(TestBed.inject(Router).url).toBe('/forbidden');
    expect(content()).toContain('Droits insuffisants');
  });
});
