import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { describe, it, expect, beforeEach } from 'vitest';

import { UserDetailComponent } from './user-detail.component';
import { UserFacade } from '../../facades/user.facade';
import type { User } from '../../models/user.model';
import type { Student } from '../../../students/models/student.model';

describe('UserDetailComponent', () => {
  let component: UserDetailComponent;
  let fixture: ComponentFixture<UserDetailComponent>;
  let mockUserFacade: Partial<Record<keyof UserFacade, any>>;

  const mockUser: User = {
    id: 'USR003',
    username: 'sv001',
    displayName: 'Nguyen Van A',
    email: 'a@example.com',
    role: 'student',
    status: 'active',
    studentId: 'SV001',
    createdAt: '2026-01-03'
  };

  const mockStudent: Student = {
    id: 'SV001',
    name: 'Nguyen Van A',
    email: 'a@example.com',
    phone: '0901234567',
    className: 'CNTT-K68-01',
    faculty: 'CNTT'
  };

  beforeEach(async () => {
    mockUserFacade = {
      selectedStudentProfile: signal(mockStudent),
      selectedTeacherProfile: signal(null)
    };

    await TestBed.configureTestingModule({
      imports: [UserDetailComponent],
      providers: [
        { provide: UserFacade, useValue: mockUserFacade }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(UserDetailComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('user', mockUser);
    fixture.detectChanges();
  });

  it('renders user account details and linked student profile information', () => {
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('sv001');
    expect(text).toContain('Nguyen Van A');
    expect(text).toContain('CNTT-K68-01');
    expect(text).toContain('0901234567');
  });

  it('emits close event when close button is clicked', () => {
    let closed = false;
    component.close.subscribe(() => {
      closed = true;
    });

    const closeBtn = fixture.nativeElement.querySelector('.form-actions button');
    closeBtn.click();

    expect(closed).toBe(true);
  });
});
