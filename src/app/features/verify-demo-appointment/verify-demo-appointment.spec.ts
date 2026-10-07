import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it, afterEach } from 'vitest';
import { VerifyDemoAppointment } from './verify-demo-appointment';

describe('VerifyDemoAppointment', () => {
  let http: HttpTestingController;

  function render(token: string | null) {
    TestBed.configureTestingModule({
      imports: [VerifyDemoAppointment],
      providers: [
        provideRouter([]), provideHttpClient(), provideHttpClientTesting(),
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: { get: (key: string) => key === 'token' ? token : null } } } },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(VerifyDemoAppointment);
    fixture.detectChanges();
    return fixture;
  }

  afterEach(() => http?.verify());

  it('does not call the API when the token is absent', () => {
    const fixture = render(null);
    expect(fixture.nativeElement.textContent).toContain('Le lien de vérification est incomplet.');
    http.expectNone(() => true);
  });

  it('shows only public reservation data for a valid token', () => {
    const fixture = render('signed-token');
    const request = http.expectOne('/api/demo/verify?token=signed-token');
    expect(request.request.method).toBe('GET');
    request.flush({
      publicReference: 'DEMO-RDV-123456', contactFirstName: 'Alice', contactLastName: 'Martin',
      startDateTime: '2030-01-08T09:00:00', endDateTime: '2030-01-08T09:30:00',
      reason: 'Entretien', status: 'CONFIRMED',
    });
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('DEMO-RDV-123456');
    expect(text).toContain('Alice');
    expect(text).toContain('Martin');
    expect(text).toContain('09:00 - 09:30');
    expect(text).toContain('Entretien');
    expect(text).toContain('Confirmé');
    expect(text).toContain('Vérification de démonstration');
    expect(text).not.toContain('alice@example');
    expect(text).not.toContain('signed-token');
    expect(text).not.toContain('userId');
  });

  it('shows the generic invalid message when verification fails', () => {
    const fixture = render('invalid-token');
    http.expectOne('/api/demo/verify?token=invalid-token').flush({ message: 'not found' }, { status: 404, statusText: 'Not Found' });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain("Cette réservation de démonstration est introuvable ou le lien n'est plus valide.");
    expect(fixture.nativeElement.textContent).not.toContain('invalid-token');
  });
});
