import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { provideClientHydration } from '@angular/platform-browser';
import { errorInterceptor } from './core/interceptors/error.interceptor';
// import { clientHeaderInterceptor } from './core/interceptors/client-header.interceptor';
import { loadingInterceptor } from './core/interceptors/loading.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes), provideClientHydration(),
    provideHttpClient(withInterceptors([loadingInterceptor, errorInterceptor]))
  ]
};
