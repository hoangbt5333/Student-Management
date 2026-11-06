import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import {
  pendingChangesGuard,
  confirmDiscardChanges,
  HasPendingChanges,
  CONFIRM_DISCARD_CHANGES_MESSAGE
} from './pending-changes.guard';

describe('pendingChangesGuard', () => {
  const dummyRoute = {} as ActivatedRouteSnapshot;
  const dummyState = {} as RouterStateSnapshot;

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('allows deactivation when component has no pending changes', () => {
    const component: HasPendingChanges = {
      hasUnsavedChanges: () => false
    };

    const result = TestBed.runInInjectionContext(() =>
      pendingChangesGuard(component, dummyRoute, dummyState, dummyState)
    );

    expect(result).toBe(true);
  });

  it('prompts confirmation and allows deactivation when confirmed', () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    const component: HasPendingChanges = {
      hasUnsavedChanges: () => true
    };

    const result = TestBed.runInInjectionContext(() =>
      pendingChangesGuard(component, dummyRoute, dummyState, dummyState)
    );

    expect(confirmSpy).toHaveBeenCalledWith(CONFIRM_DISCARD_CHANGES_MESSAGE);
    expect(result).toBe(true);
  });

  it('prompts confirmation and blocks deactivation when cancelled', () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
    const component: HasPendingChanges = {
      hasUnsavedChanges: () => true
    };

    const result = TestBed.runInInjectionContext(() =>
      pendingChangesGuard(component, dummyRoute, dummyState, dummyState)
    );

    expect(confirmSpy).toHaveBeenCalledWith(CONFIRM_DISCARD_CHANGES_MESSAGE);
    expect(result).toBe(false);
  });

  it('allows deactivation if component does not implement hasUnsavedChanges', () => {
    const component = {} as unknown as HasPendingChanges;
    const result = TestBed.runInInjectionContext(() =>
      pendingChangesGuard(component, dummyRoute, dummyState, dummyState)
    );
    expect(result).toBe(true);
  });
});
