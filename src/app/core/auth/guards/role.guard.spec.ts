import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  GuardResult,
  MaybeAsync,
  provideRouter,
  Router,
  RouterStateSnapshot,
  UrlTree
} from '@angular/router';

import { AuthFacade } from '../facades/auth.facade';
import { AuthUser } from '../models/auth.model';
import { authGuard } from './auth.guard';
import { roleGuard } from './role.guard';

describe('Authentication and role guards', () => {
  let router: Router;
  let currentUser: AuthUser | null;
  let authenticated: boolean;

  beforeEach(() => {
    currentUser = null;
    authenticated = false;

    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: AuthFacade,
          useValue: {
            currentUser: () => currentUser,
            isAuthenticated: () => authenticated
          }
        }
      ]
    });

    router = TestBed.inject(Router);
  });

  function runAuthGuard(url: string): MaybeAsync<GuardResult> {
    return TestBed.runInInjectionContext(() =>
      authGuard(
        {} as ActivatedRouteSnapshot,
        { url } as RouterStateSnapshot
      )
    );
  }

  function runRoleGuard(
    url: string,
    roles: string[]
  ): MaybeAsync<GuardResult> {
    return TestBed.runInInjectionContext(() =>
      roleGuard(
        { data: { roles } } as Partial<ActivatedRouteSnapshot> as ActivatedRouteSnapshot,
        { url } as RouterStateSnapshot
      )
    );
  }

  function expectRedirect(
    result: MaybeAsync<GuardResult>,
    expectedUrl: string
  ): void {
    if (!(result instanceof UrlTree)) {
      throw new Error('Expected guard to return a UrlTree redirect.');
    }

    expect(router.serializeUrl(result)).toBe(expectedUrl);
  }

  it('redirects unauthenticated users to login with the requested URL', () => {
    expectRedirect(runAuthGuard('/students'), '/login?returnUrl=%2Fstudents');
  });

  it('allows an authenticated admin into the admin-only users route', () => {
    authenticated = true;
    currentUser = {
      id: 'USR001',
      username: 'admin',
      displayName: 'Admin',
      role: 'admin'
    };

    expect(runRoleGuard('/users', ['admin'])).toBe(true);
  });

  it('redirects a lecturer from the admin-only users route', () => {
    currentUser = {
      id: 'USR002',
      username: 'gv001',
      displayName: 'Lecturer',
      role: 'teacher'
    };

    expectRedirect(runRoleGuard('/users', ['admin']), '/forbidden');
  });

  it('allows admins and lecturers to access grades, but denies students', () => {
    currentUser = {
      id: 'USR002',
      username: 'gv001',
      displayName: 'Lecturer',
      role: 'teacher'
    };
    expect(runRoleGuard('/grades', ['admin', 'teacher'])).toBe(true);

    currentUser = {
      id: 'USR003',
      username: 'sv001',
      displayName: 'Student',
      role: 'student'
    };
    expectRedirect(
      runRoleGuard('/grades', ['admin', 'teacher']),
      '/forbidden'
    );
  });
});
