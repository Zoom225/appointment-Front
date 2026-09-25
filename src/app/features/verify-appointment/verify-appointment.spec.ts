import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it } from 'vitest';
import { API_ENDPOINTS } from '../../core/api/api-endpoints';
import { routes } from '../../app.routes';
import { VerifyAppointment } from './verify-appointment';

describe('VerifyAppointment', () => {
  let httpMock: HttpTestingController;
  let token: string | null;

  beforeEach(() => {
    token = 'qr-token';
    TestBed.configureTestingModule({
      imports: [VerifyAppointment],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting(), { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: { get: () => token } } } }],
    });
    httpMock = TestBed.inject(HttpTestingController);
  });

  it('loads and displays the public appointment without exposing email or token', () => {
    const fixture = TestBed.createComponent(VerifyAppointment);
    fixture.detectChanges();
    expect((fixture.componentInstance as any).isLoading()).toBe(true);
    httpMock.expectOne(`${API_ENDPOINTS.publicAppointmentVerification}?token=qr-token`).flush({ publicReference: 'APT-PUBLIC-1', contactFirstName: 'Alice', contactLastName: 'Martin', startDateTime: '2030-01-08T10:00:00', endDateTime: '2030-01-08T10:30:00', reason: 'Entretien', status: 'CONFIRMED' });
    fixture.detectChanges();
    expect((fixture.componentInstance as any).isLoading()).toBe(false);
    expect(fixture.nativeElement.textContent).toContain('APT-PUBLIC-1');
    expect(fixture.nativeElement.textContent).toContain('Alice');
    expect(fixture.nativeElement.textContent).not.toContain('qr-token');
    expect(fixture.nativeElement.textContent).not.toContain('@');
  });

  it('shows the invalid-link message when verification fails', () => {
    const fixture = TestBed.createComponent(VerifyAppointment);
    fixture.detectChanges();
    httpMock.expectOne(`${API_ENDPOINTS.publicAppointmentVerification}?token=qr-token`).flush({}, { status: 404, statusText: 'Not Found' });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Rendez-vous introuvable ou lien invalide.');
  });

  it('keeps the verification route public', () => {
    const route = routes.find((item) => item.path === 'verify-appointment');
    expect(route).toBeTruthy();
    expect(route?.canActivate).toBeUndefined();
  });
});
