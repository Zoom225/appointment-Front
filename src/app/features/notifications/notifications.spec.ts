import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { API_ENDPOINTS } from '../../core/api/api-endpoints';
import { Notifications } from './notifications';

describe('Notifications', () => {
  let httpMock: HttpTestingController;
  beforeEach(() => { TestBed.configureTestingModule({ imports: [Notifications], providers: [provideHttpClient(), provideHttpClientTesting()] }); httpMock = TestBed.inject(HttpTestingController); });
  it('loads backend notifications and marks one as read', () => {
    const notification = { id: 2, appointmentId: 4, recipientId: 8, type: 'CREATED' as const, title: 'Créé', message: 'Message', createdAt: '2026-09-23T10:00:00', readAt: null };
    const fixture = TestBed.createComponent(Notifications); fixture.detectChanges();
    httpMock.expectOne(`${API_ENDPOINTS.notifications}?page=0&size=20`).flush({ content: [notification], totalElements: 1, totalPages: 1, size: 20, number: 0, numberOfElements: 1, first: true, last: true, empty: false });
    const component = fixture.componentInstance as any; component.markAsRead(notification);
    httpMock.expectOne(`${API_ENDPOINTS.notifications}/2/read`).flush({ ...notification, readAt: '2026-09-23T11:00:00' });
    expect(component.notifications()[0].readAt).toBe('2026-09-23T11:00:00');
  });
});
