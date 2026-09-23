import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { API_ENDPOINTS } from '../../core/api/api-endpoints';
import { AppointmentHistory } from './appointment-history';

describe('AppointmentHistory', () => {
  let httpMock: HttpTestingController;
  beforeEach(() => { TestBed.configureTestingModule({ imports: [AppointmentHistory], providers: [provideHttpClient(), provideHttpClientTesting()] }); httpMock = TestBed.inject(HttpTestingController); });
  it('loads a paginated user history', () => {
    const fixture = TestBed.createComponent(AppointmentHistory); fixture.detectChanges();
    httpMock.expectOne(`${API_ENDPOINTS.myAppointments.history}?page=0&size=10`).flush({ content: [], totalElements: 0, totalPages: 0, size: 10, number: 0, numberOfElements: 0, first: true, last: true, empty: true });
    expect((fixture.componentInstance as any).appointments()).toEqual([]);
    expect((fixture.componentInstance as any).isLoading()).toBe(false);
  });
});
