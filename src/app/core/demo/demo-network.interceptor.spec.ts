import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, expect, it, afterEach, beforeEach } from 'vitest';
import { demoNetworkInterceptor } from './demo-network.interceptor';
import { DemoModeService } from './demo-mode.service';

describe('demoNetworkInterceptor with the demo email function', () => {
  let http: HttpTestingController;
  let client: HttpClient;

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({ providers: [
      provideRouter([]), provideHttpClient(withInterceptors([demoNetworkInterceptor])), provideHttpClientTesting(),
    ] });
    http = TestBed.inject(HttpTestingController);
    client = TestBed.inject(HttpClient);
    TestBed.inject(DemoModeService).activate('USER');
  });

  afterEach(() => {
    http.verify();
    sessionStorage.clear();
  });

  it('allows the demo email function without adding a Bearer token', () => {
    client.post('/api/demo/send-confirmation', {}).subscribe();
    const send = http.expectOne('/api/demo/send-confirmation');
    expect(send.request.headers.has('Authorization')).toBe(false);
    send.flush({ sent: true });
  });

  it('blocks all other backend paths while in demo mode', async () => {
    const result = await new Promise<unknown>((resolve) => client.get('/api/appointments').subscribe({ error: resolve }));
    expect(result).toMatchObject({ status: 403 });
    http.expectNone(() => true);
  });
});
