import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router, provideRouter } from '@angular/router';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import {
  errorInterceptor,
  ERROR_RETRY_CONFIG,
  ErrorRetryConfig
} from './error.interceptor';
import { NotificationService } from '../services/notification.service';
import { AuthFacade } from '../auth/facades/auth.facade';

describe('errorInterceptor', () => {
  let httpClient: HttpClient;
  let httpMock: HttpTestingController;
  let mockNotificationService: { showError: ReturnType<typeof vi.fn>; clearError: ReturnType<typeof vi.fn> };
  let mockAuthFacade: { logout: ReturnType<typeof vi.fn> };

  const testRetryConfig: ErrorRetryConfig = {
    maxRetries: 2,
    initialDelayMs: 100,
    backoffFactor: 2
  };

  beforeEach(() => {
    vi.useFakeTimers();

    mockNotificationService = {
      showError: vi.fn(),
      clearError: vi.fn()
    };

    mockAuthFacade = {
      logout: vi.fn()
    };

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([errorInterceptor])),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: NotificationService, useValue: mockNotificationService },
        { provide: AuthFacade, useValue: mockAuthFacade },
        { provide: ERROR_RETRY_CONFIG, useValue: testRetryConfig }
      ]
    });

    httpClient = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('Pass-through on Success', () => {
    it('should pass through successful GET requests without interference', () => {
      const mockData = { id: 1, name: 'Test' };
      let response: unknown;

      httpClient.get('/api/test').subscribe((res) => {
        response = res;
      });

      const req = httpMock.expectOne('/api/test');
      expect(req.request.method).toBe('GET');
      req.flush(mockData);

      expect(response).toEqual(mockData);
      expect(mockNotificationService.showError).not.toHaveBeenCalled();
    });

    it('should pass through successful POST requests without interference', () => {
      const payload = { title: 'New Item' };
      const createdItem = { id: 101, ...payload };
      let response: unknown;

      httpClient.post('/api/test', payload).subscribe((res) => {
        response = res;
      });

      const req = httpMock.expectOne('/api/test');
      expect(req.request.method).toBe('POST');
      req.flush(createdItem, { status: 201, statusText: 'Created' });

      expect(response).toEqual(createdItem);
      expect(mockNotificationService.showError).not.toHaveBeenCalled();
    });
  });

  describe('Auto-Retry with Exponential Backoff (GET requests)', () => {
    it('should retry GET request on status 0 (Network Error) and succeed on 2nd retry', async () => {
      let finalResult: unknown;
      let finalError: unknown;

      httpClient.get('/api/network-retry').subscribe({
        next: (data) => (finalResult = data),
        error: (err) => (finalError = err)
      });

      // 1st attempt: fails with status 0
      const req1 = httpMock.expectOne('/api/network-retry');
      req1.error(new ProgressEvent('error'), { status: 0, statusText: 'Unknown Error' });

      // Exponential backoff 1: initialDelayMs (100ms)
      await vi.advanceTimersByTimeAsync(100);

      // 2nd attempt (1st retry): fails with status 0
      const req2 = httpMock.expectOne('/api/network-retry');
      req2.error(new ProgressEvent('error'), { status: 0, statusText: 'Unknown Error' });

      // Exponential backoff 2: 100ms * 2 = 200ms
      await vi.advanceTimersByTimeAsync(200);

      // 3rd attempt (2nd retry): succeeds!
      const req3 = httpMock.expectOne('/api/network-retry');
      req3.flush({ message: 'recovered' });

      expect(finalResult).toEqual({ message: 'recovered' });
      expect(finalError).toBeUndefined();
      expect(mockNotificationService.showError).not.toHaveBeenCalled();
    });

    it('should retry GET request on status 500 up to 2 times and fail after retries exhausted', async () => {
      let finalError: unknown;

      httpClient.get('/api/server-error').subscribe({
        error: (err) => (finalError = err)
      });

      // 1st attempt
      const req1 = httpMock.expectOne('/api/server-error');
      req1.flush('Server Error', { status: 500, statusText: 'Internal Server Error' });

      // Retry 1 after 100ms
      await vi.advanceTimersByTimeAsync(100);
      const req2 = httpMock.expectOne('/api/server-error');
      req2.flush('Server Error', { status: 500, statusText: 'Internal Server Error' });

      // Retry 2 after 200ms
      await vi.advanceTimersByTimeAsync(200);
      const req3 = httpMock.expectOne('/api/server-error');
      req3.flush('Server Error', { status: 500, statusText: 'Internal Server Error' });

      // Max retries (2) reached: no more requests
      httpMock.expectNone('/api/server-error');

      expect(finalError).toBeDefined();
      expect(mockNotificationService.showError).toHaveBeenCalledWith(
        'Máy chủ đang gặp sự cố. Hãy thử lại.'
      );
    });

    it('should retry GET request on status 503 and succeed on first retry', async () => {
      let finalResult: unknown;

      httpClient.get('/api/service-unavailable').subscribe({
        next: (res) => (finalResult = res)
      });

      // 1st attempt: 503
      const req1 = httpMock.expectOne('/api/service-unavailable');
      req1.flush('Service Unavailable', { status: 503, statusText: 'Service Unavailable' });

      // Advance 100ms
      await vi.advanceTimersByTimeAsync(100);

      // 2nd attempt (1st retry): succeeds
      const req2 = httpMock.expectOne('/api/service-unavailable');
      req2.flush({ status: 'ok' });

      expect(finalResult).toEqual({ status: 'ok' });
      expect(mockNotificationService.showError).not.toHaveBeenCalled();
    });

    it('should accurately apply exponential backoff timing', async () => {
      httpClient.get('/api/backoff-timing').subscribe({ error: () => {} });

      // 1st attempt
      const req1 = httpMock.expectOne('/api/backoff-timing');
      req1.flush('Error', { status: 500, statusText: 'Server Error' });

      // Before 100ms: no retry request dispatched yet
      await vi.advanceTimersByTimeAsync(99);
      httpMock.expectNone('/api/backoff-timing');

      // At 100ms: 1st retry request is dispatched
      await vi.advanceTimersByTimeAsync(1);
      const req2 = httpMock.expectOne('/api/backoff-timing');
      req2.flush('Error', { status: 500, statusText: 'Server Error' });

      // Before 200ms: no 2nd retry dispatched yet
      await vi.advanceTimersByTimeAsync(199);
      httpMock.expectNone('/api/backoff-timing');

      // At 200ms: 2nd retry is dispatched
      await vi.advanceTimersByTimeAsync(1);
      const req3 = httpMock.expectOne('/api/backoff-timing');
      req3.flush('Error', { status: 500, statusText: 'Server Error' });
    });
  });

  describe('Strict Prohibition of Retry for Mutating Requests', () => {
    it('should NOT retry POST requests on status 500', () => {
      let finalError: unknown;

      httpClient.post('/api/create', { name: 'item' }).subscribe({
        error: (err) => (finalError = err)
      });

      const req = httpMock.expectOne('/api/create');
      req.flush('Server Error', { status: 500, statusText: 'Internal Server Error' });

      // Must not dispatch any retry
      httpMock.expectNone('/api/create');
      expect(finalError).toBeDefined();
      expect(mockNotificationService.showError).toHaveBeenCalledWith(
        'Máy chủ đang gặp sự cố. Hãy thử lại.'
      );
    });

    it('should NOT retry POST requests on network error (status 0)', () => {
      let finalError: unknown;

      httpClient.post('/api/create', { name: 'item' }).subscribe({
        error: (err) => (finalError = err)
      });

      const req = httpMock.expectOne('/api/create');
      req.error(new ProgressEvent('error'), { status: 0, statusText: 'Network Error' });

      httpMock.expectNone('/api/create');
      expect(finalError).toBeDefined();
      expect(mockNotificationService.showError).toHaveBeenCalledWith(
        'Không thể kết nối đến máy chủ. Hãy kiểm tra API'
      );
    });

    it('should NOT retry PUT requests on status 502', () => {
      let finalError: unknown;

      httpClient.put('/api/update/1', { name: 'updated' }).subscribe({
        error: (err) => (finalError = err)
      });

      const req = httpMock.expectOne('/api/update/1');
      req.flush('Bad Gateway', { status: 502, statusText: 'Bad Gateway' });

      httpMock.expectNone('/api/update/1');
      expect(finalError).toBeDefined();
    });

    it('should NOT retry PATCH requests on status 503', () => {
      let finalError: unknown;

      httpClient.patch('/api/patch/1', { active: true }).subscribe({
        error: (err) => (finalError = err)
      });

      const req = httpMock.expectOne('/api/patch/1');
      req.flush('Service Unavailable', { status: 503, statusText: 'Service Unavailable' });

      httpMock.expectNone('/api/patch/1');
      expect(finalError).toBeDefined();
    });

    it('should NOT retry DELETE requests on status 500', () => {
      let finalError: unknown;

      httpClient.delete('/api/delete/1').subscribe({
        error: (err) => (finalError = err)
      });

      const req = httpMock.expectOne('/api/delete/1');
      req.flush('Server Error', { status: 500, statusText: 'Internal Server Error' });

      httpMock.expectNone('/api/delete/1');
      expect(finalError).toBeDefined();
    });
  });

  describe('No Retry for Client Errors (4xx)', () => {
    it('should NOT retry GET requests on 400 Bad Request', () => {
      let finalError: unknown;

      httpClient.get('/api/bad-request').subscribe({
        error: (err) => (finalError = err)
      });

      const req = httpMock.expectOne('/api/bad-request');
      req.flush('Bad Request', { status: 400, statusText: 'Bad Request' });

      httpMock.expectNone('/api/bad-request');
      expect(finalError).toBeDefined();
      expect(mockNotificationService.showError).toHaveBeenCalledWith(
        'Kiểm tra dữ liệu gửi đi.'
      );
    });

    it('should NOT retry GET requests on 403 Forbidden', () => {
      let finalError: unknown;

      httpClient.get('/api/forbidden').subscribe({
        error: (err) => (finalError = err)
      });

      const req = httpMock.expectOne('/api/forbidden');
      req.flush('Forbidden', { status: 403, statusText: 'Forbidden' });

      httpMock.expectNone('/api/forbidden');
      expect(finalError).toBeDefined();
      expect(mockNotificationService.showError).toHaveBeenCalledWith(
        'Bạn không có quyền thực hiện '
      );
    });

    it('should NOT retry GET requests on 404 Not Found', () => {
      let finalError: unknown;

      httpClient.get('/api/not-found').subscribe({
        error: (err) => (finalError = err)
      });

      const req = httpMock.expectOne('/api/not-found');
      req.flush('Not Found', { status: 404, statusText: 'Not Found' });

      httpMock.expectNone('/api/not-found');
      expect(finalError).toBeDefined();
      expect(mockNotificationService.showError).toHaveBeenCalledWith(
        'Không tìm thấy dữ liệu.'
      );
    });
  });

  describe('401 Unauthorized Handling', () => {
    it('should clear session storage, call authFacade.logout(), and notify on 401', () => {
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.setItem('demo-auth-user', JSON.stringify({ id: 1, username: 'test' }));
      }

      let finalError: unknown;

      httpClient.get('/api/unauthorized').subscribe({
        error: (err) => (finalError = err)
      });

      const req = httpMock.expectOne('/api/unauthorized');
      req.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });

      // No retry
      httpMock.expectNone('/api/unauthorized');

      expect(finalError).toBeDefined();
      expect(mockAuthFacade.logout).toHaveBeenCalledTimes(1);
      if (typeof sessionStorage !== 'undefined') {
        expect(sessionStorage.getItem('demo-auth-user')).toBeNull();
      }
      expect(mockNotificationService.showError).toHaveBeenCalledWith(
        'Bạn cần đăng nhập để tiếp tục.'
      );
    });

    it('should navigate to /login when AuthFacade is not provided', () => {
      // Re-configure without AuthFacade
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          provideHttpClient(withInterceptors([errorInterceptor])),
          provideHttpClientTesting(),
          provideRouter([]),
          { provide: NotificationService, useValue: mockNotificationService }
        ]
      });

      const localHttp = TestBed.inject(HttpClient);
      const localHttpMock = TestBed.inject(HttpTestingController);
      const localRouter = TestBed.inject(Router);
      const navigateSpy = vi.spyOn(localRouter, 'navigateByUrl');

      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.setItem('demo-auth-user', JSON.stringify({ id: 2, username: 'user2' }));
      }

      localHttp.get('/api/unauthorized-no-facade').subscribe({
        error: () => {}
      });

      const req = localHttpMock.expectOne('/api/unauthorized-no-facade');
      req.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });

      expect(navigateSpy).toHaveBeenCalledWith('/login');
      if (typeof sessionStorage !== 'undefined') {
        expect(sessionStorage.getItem('demo-auth-user')).toBeNull();
      }

      localHttpMock.verify();
    });
  });

  describe('Other Status Codes', () => {
    it('should handle unmapped HTTP error codes (e.g. 418 I am a teapot)', () => {
      httpClient.get('/api/teapot').subscribe({ error: () => {} });

      const req = httpMock.expectOne('/api/teapot');
      req.flush('Teapot', { status: 418, statusText: "I'm a teapot" });

      expect(mockNotificationService.showError).toHaveBeenCalledWith('Lỗi HTTP');
    });
  });
});
