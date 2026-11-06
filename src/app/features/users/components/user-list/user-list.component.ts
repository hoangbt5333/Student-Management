import { Component, OnInit, inject, signal } from '@angular/core';

import { UserFacade } from '../../facades/user.facade';
import { AuthFacade } from '../../../../core/auth/facades/auth.facade';
import { UserFormComponent } from '../user-form/user-form.component';
import { UserDetailComponent } from '../user-detail/user-detail.component';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import type { User, UserRole, UserStatus } from '../../models/user.model';

@Component({
  selector: 'app-user-list',
  standalone: true,
  imports: [UserFormComponent, UserDetailComponent, ModalComponent],
  templateUrl: './user-list.component.html',
  styleUrl: './user-list.component.css'
})
export class UserListComponent implements OnInit {
  readonly userFacade = inject(UserFacade);
  readonly authFacade = inject(AuthFacade);

  showForm = signal(false);
  editingUser = signal<User | null>(null);

  showDetail = signal(false);
  detailedUser = signal<User | null>(null);

  get currentAdminId(): string | undefined {
    return this.authFacade.currentUser()?.id;
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

  closeForm(): void {
    this.showForm.set(false);
    this.editingUser.set(null);
    this.userFacade.selectUser(null);
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
    this.userFacade.setSearchTerm(keyword);
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

  onPageSizeChange(size: string): void {
    this.userFacade.setPageSize(Number(size));
  }
}
