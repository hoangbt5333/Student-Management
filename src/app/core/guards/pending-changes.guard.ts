import { CanDeactivateFn } from '@angular/router';

export interface HasPendingChanges {
  hasUnsavedChanges(): boolean;
}

export const CONFIRM_DISCARD_CHANGES_MESSAGE = 'Bạn có thay đổi chưa lưu. Bạn có chắc chắn muốn thoát?';

export function confirmDiscardChanges(message = CONFIRM_DISCARD_CHANGES_MESSAGE): boolean {
  if (typeof window !== 'undefined' && typeof window.confirm === 'function') {
    return window.confirm(message);
  }
  return true;
}

export const pendingChangesGuard: CanDeactivateFn<HasPendingChanges> = (component) => {
  if (component && typeof component.hasUnsavedChanges === 'function' && component.hasUnsavedChanges()) {
    return confirmDiscardChanges();
  }
  return true;
};
