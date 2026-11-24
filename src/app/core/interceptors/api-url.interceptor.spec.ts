import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { API_BASE_URL, apiUrlInterceptor } from './api-url.interceptor';

describe('apiUrlInterceptor', () => {
  describe('with default API_BASE_URL', () => {
    let httpClient: HttpClient;
    let httpMock: HttpTestingController;

    beforeEach(() => {
      TestBed.configureTestingModule({
        providers: [
          provideHttpClient(withInterceptors([apiUrlInterceptor])),
          provideHttpClientTesting()
        ]
      });

      httpClient = TestBed.inject(HttpClient);
      httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => {
      httpMock.verify();
    });

    it('should prepend default base URL (http://localhost:3001) to relative URLs starting with /', () => {
      httpClient.get('/students').subscribe();

      const req = httpMock.expectOne('http://localhost:3001/students');
      expect(req.request.method).toBe('GET');
      req.flush([]);
    });

    it('should prepend default base URL to relative URLs without leading /', () => {
      httpClient.get('classes/123').subscribe();

      const req = httpMock.expectOne('http://localhost:3001/classes/123');
      expect(req.request.method).toBe('GET');
      req.flush({});
    });

    it('should not alter absolute URLs starting with http://', () => {
      httpClient.get('http://other-domain.org/api/data').subscribe();

      const req = httpMock.expectOne('http://other-domain.org/api/data');
      expect(req.request.method).toBe('GET');
      req.flush({});
    });

    it('should not alter absolute URLs starting with https://', () => {
      httpClient.get('https://secure-api.org/v1/users').subscribe();

      const req = httpMock.expectOne('https://secure-api.org/v1/users');
      expect(req.request.method).toBe('GET');
      req.flush([]);
    });

    it('should not alter protocol-relative URLs starting with //', () => {
      httpClient.get('//cdn.example.com/assets/config.json').subscribe();

      const req = httpMock.expectOne('//cdn.example.com/assets/config.json');
      expect(req.request.method).toBe('GET');
      req.flush({});
    });
  });

  describe('with custom API_BASE_URL and trailing slash', () => {
    let httpClient: HttpClient;
    let httpMock: HttpTestingController;

    beforeEach(() => {
      TestBed.configureTestingModule({
        providers: [
          { provide: API_BASE_URL, useValue: 'https://api.production.edu.vn/' },
          provideHttpClient(withInterceptors([apiUrlInterceptor])),
          provideHttpClientTesting()
        ]
      });

      httpClient = TestBed.inject(HttpClient);
      httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => {
      httpMock.verify();
    });

    it('should normalize trailing slashes on base URL and prepend correctly', () => {
      httpClient.get('/teachers').subscribe();

      const req = httpMock.expectOne('https://api.production.edu.vn/teachers');
      expect(req.request.method).toBe('GET');
      req.flush([]);
    });
  });
});
