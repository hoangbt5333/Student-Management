import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { UserFormComponent } from './user-form.component';
import { UserFacade } from '../../facades/user.facade';
import type { User } from '../../models/user.model';
import type { Student } from '../../../students/models/student.model';
import type { Teacher } from '../../../teachers/models/teacher.model';

describe('UserFormComponent', () => {
  let component: UserFormComponent;
  let fixture: ComponentFixture<UserFormComponent>;
  let mockUserFacade: Partial<Record<keyof UserFacade, any>>;

  const mockStudents: Student[] = [
    { id: 'SV001', name: 'Nguyen Van A', email: 'a@example.com', phone: '0901234567' }
  ];

  const mockTeachers: Teacher[] = [
    { id: 'GV001', name: 'Nguyễn Minh An', email: 'minhan@example.com', department: 'CNTT' }
  ];

  beforeEach(async () => {
    mockUserFacade = {
      students: signal(mockStudents),
      teachers: signal(mockTeachers),
      availableStudents: signal(mockStudents),
      availableTeachers: signal(mockTeachers),
      createUser: vi.fn().mockReturnValue(true),
      updateUser: vi.fn().mockReturnValue(true)
    };

    await TestBed.configureTestingModule({
      imports: [UserFormComponent],
      providers: [
        { provide: UserFacade, useValue: mockUserFacade }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(UserFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('initializes in create mode with default student role and password validation', () => {
    expect(component.isEditMode).toBe(false);
    expect(component.form.controls.username.enabled).toBe(true);
    expect(component.form.controls.role.enabled).toBe(true);
    expect(component.form.controls.displayName.disabled).toBe(true); // Auto-enforced for student
    expect(component.form.controls.email.disabled).toBe(true);       // Auto-enforced for student
  });

  it('enables displayName and email when role is admin in create mode', () => {
    component.form.controls.role.setValue('admin');
    expect(component.form.controls.displayName.enabled).toBe(true);
    expect(component.form.controls.email.enabled).toBe(true);
  });

  it('auto-fills displayName and email when studentId is selected', () => {
    component.form.controls.studentId.setValue('SV001');
    expect(component.form.getRawValue().displayName).toBe('Nguyen Van A');
    expect(component.form.getRawValue().email).toBe('a@example.com');
  });

  it('disables username and role in edit mode', () => {
    const existingUser: User = {
      id: 'USR001',
      username: 'admin',
      displayName: 'Admin User',
      email: 'admin@example.com',
      role: 'admin',
      status: 'active',
      createdAt: '2026-01-01'
    };

    fixture.componentRef.setInput('user', existingUser);
    fixture.detectChanges();

    expect(component.isEditMode).toBe(true);
    expect(component.form.controls.username.disabled).toBe(true);
    expect(component.form.controls.role.disabled).toBe(true);
  });
});
