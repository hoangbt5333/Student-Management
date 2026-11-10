import { Component, OnInit, effect, inject, signal, ViewChild, HostListener, ChangeDetectionStrategy } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DatePipe } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { debounceTime, distinctUntilChanged } from 'rxjs';

import { UserFacade } from '../../facades/user.facade';
import { AuthFacade } from '../../../../core/auth/facades/auth.facade';
import { UserFormComponent } from '../user-form/user-form.component';
import { UserDetailComponent } from '../user-detail/user-detail.component';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';
import { TooltipDirective } from '../../../../shared/directives/tooltip/tooltip.directive';
import type { User, UserRole, UserStatus } from '../../models/user.model';
import { confirmDiscardChanges, HasPendingChanges } from '../../../../core/guards/pending-changes.guard';

@Component({
  selector: 'app-user-list',
  standalone: true,
  imports: [UserFormComponent, UserDetailComponent, ModalComponent, PaginationComponent, TooltipDirective, DatePipe, ReactiveFormsModule],
  templateUrl: './user-list.component.html',
  styleUrl: './user-list.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserListComponent implements OnInit, HasPendingChanges {
  @ViewChild(UserFormComponent) private userForm?: UserFormComponent;

  readonly userFacade = inject(UserFacade);
  readonly authFacade = inject(AuthFacade);

  readonly searchControl = new FormControl('', { nonNullable: true });

  showForm = signal(false);
  editingUser = signal<User | null>(null);

  showDetail = signal(false);
  detailedUser = signal<User | null>(null);

  get currentAdminId(): string | undefined {
    return this.authFacade.currentUser()?.id;
  }

  constructor() {
    this.searchControl.setValue(this.userFacade.searchTerm(), { emitEvent: false });

    // Đồng bộ nếu searchTerm trong facade bị thay đổi/reset từ bên ngoài
    effect(() => {
      const current = this.userFacade.searchTerm();
      if (this.searchControl.value !== current) {
        this.searchControl.setValue(current, { emitEvent: false });
      }
    });

    this.searchControl.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntilDestroyed()
      )
      .subscribe((keyword) => {
        this.userFacade.setSearchTerm(keyword);
      });
  }

  hasUnsavedChanges(): boolean {
    return this.showForm() && (this.userForm?.hasUnsavedChanges() ?? false);
  }

  @HostListener('window:beforeunload', ['$event'])
  onBeforeUnload(event: BeforeUnloadEvent): void {
    if (this.hasUnsavedChanges()) {
      event.preventDefault();
    }
  }

  ngOnInit(): void {
    this.userFacade.loadAll();
  }

  openCreate(): void {
    this.editingUser.set(null);
    this.showDetail.set(false);
    this.showForm.set(true);
  }

  openEdit(user: User): void {
    this.editingUser.set(user);
    this.showDetail.set(false);
    this.userFacade.selectUser(user.id);
    this.showForm.set(true);
  }

  openDetail(user: User): void {
    this.detailedUser.set(user);
    this.showForm.set(false);
    this.userFacade.selectUser(user.id);
    this.showDetail.set(true);
  }

  closeForm(force = false): void {
    if (!force && this.hasUnsavedChanges()) {
      if (!confirmDiscardChanges()) {
        return;
      }
    }
    this.showForm.set(false);
    this.editingUser.set(null);
    this.userFacade.selectUser(null);
  }

  onUserSaved(): void {
    this.closeForm(true);
  }

  closeDetail(): void {
    this.showDetail.set(false);
    this.detailedUser.set(null);
    this.userFacade.selectUser(null);
  }

  isSelf(user: User): boolean {
    return this.currentAdminId === user.id;
  }

  isLastActiveAdmin(user: User): boolean {
    return (
      user.role === 'admin' &&
      user.status === 'active' &&
      this.userFacade.activeAdminCount() <= 1
    );
  }

  toggleLock(user: User): void {
    if (this.isSelf(user) || this.isLastActiveAdmin(user)) {
      return;
    }
    const newStatus: UserStatus = user.status === 'locked' ? 'active' : 'locked';
    this.userFacade.changeUserStatus(user.id, newStatus, this.currentAdminId);
  }

  toggleDeactivate(user: User): void {
    if (this.isSelf(user) || this.isLastActiveAdmin(user)) {
      return;
    }
    const newStatus: UserStatus = user.status === 'inactive' ? 'active' : 'inactive';
    this.userFacade.changeUserStatus(user.id, newStatus, this.currentAdminId);
  }

  onSearch(keyword: string): void {
    this.searchControl.setValue(keyword);
  }

  resetFilters(): void {
    this.userFacade.resetFilters();
    this.searchControl.setValue('', { emitEvent: false });
  }

  onRoleFilter(role: string): void {
    this.userFacade.setRoleFilter(role as 'all' | UserRole);
  }

  onStatusFilter(status: string): void {
    this.userFacade.setStatusFilter(status as 'all' | UserStatus);
  }

  onSort(field: string): void {
    this.userFacade.setSortBy(field as keyof User);
  }

  onPageChange(page: number): void {
    this.userFacade.setPage(page);
  }

  onPageSizeChange(size: string | number): void {
    this.userFacade.setPageSize(Number(size));
  }
}
