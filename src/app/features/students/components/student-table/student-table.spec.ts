import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { By } from '@angular/platform-browser';
import { vi, describe, beforeEach, it, expect } from 'vitest';

import { StudentTable } from './student-table';
import { AuthFacade } from '../../../../core/auth/facades/auth.facade';
import type { Student } from '../../models/student.model';

describe('StudentTable', () => {
  let component: StudentTable;
  let fixture: ComponentFixture<StudentTable>;

  const mockStudents: Student[] = [
    {
      id: 'SV001',
      code: 'SV001',
      name: 'Nguyễn Văn A',
      email: 'a@example.com',
      phone: '0912345678',
      className: 'CNTT-K45',
      faculty: 'Công nghệ thông tin'
    }
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StudentTable],
      providers: [
        provideRouter([]),
        {
          provide: AuthFacade,
          useValue: {
            can: vi.fn(() => true)
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(StudentTable);
    fixture.componentRef.setInput('students', mockStudents);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display the active badge by default when status is missing', () => {
    const badge = fixture.debugElement.query(By.css('.badge-success'));
    expect(badge.nativeElement.textContent.trim()).toBe('Đang học');
  });

  it('should display the active badge when status is active', () => {
    fixture.componentRef.setInput('students', [{ ...mockStudents[0], status: 'active' }]);
    fixture.detectChanges();

    const badge = fixture.debugElement.query(By.css('.badge-success'));
    expect(badge.nativeElement.textContent.trim()).toBe('Đang học');
  });

  it('should display the inactive badge when status is inactive', () => {
    fixture.componentRef.setInput('students', [{ ...mockStudents[0], status: 'inactive' }]);
    fixture.detectChanges();

    const badge = fixture.debugElement.query(By.css('.badge-neutral'));
    expect(badge.nativeElement.textContent.trim()).toBe('Nghỉ học');
  });

  it('should render icon action buttons when user can manage students', () => {
    const actionButtons = fixture.debugElement.queryAll(By.css('.action-buttons .btn-icon-action'));
    expect(actionButtons.length).toBe(3);

    const viewDetailBtn = fixture.debugElement.query(By.css('.btn-view-detail'));
    const editBtn = fixture.debugElement.query(By.css('.edit-button'));
    const deleteBtn = fixture.debugElement.query(By.css('.delete-button'));

    expect(viewDetailBtn).toBeTruthy();
    expect(editBtn).toBeTruthy();
    expect(deleteBtn).toBeTruthy();

    expect(viewDetailBtn.nativeElement.getAttribute('aria-label')).toContain('Nguyễn Văn A');
    expect(editBtn.nativeElement.getAttribute('aria-label')).toContain('Nguyễn Văn A');
    expect(deleteBtn.nativeElement.getAttribute('aria-label')).toContain('Nguyễn Văn A');
  });

  it('should emit edit event when edit icon button is clicked', () => {
    const editSpy = vi.fn();
    component.edit.subscribe(editSpy);

    const editBtn = fixture.debugElement.query(By.css('.edit-button'));
    editBtn.nativeElement.click();

    expect(editSpy).toHaveBeenCalledWith(mockStudents[0]);
  });

  it('should emit delete event with student id when delete icon button is clicked', () => {
    const deleteSpy = vi.fn();
    component.delete.subscribe(deleteSpy);

    const deleteBtn = fixture.debugElement.query(By.css('.delete-button'));
    deleteBtn.nativeElement.click();

    expect(deleteSpy).toHaveBeenCalledWith('SV001');
  });

  it('should set empty-state colspan to match visible columns when user can manage students', () => {
    fixture.componentRef.setInput('students', []);
    fixture.detectChanges();

    const headers = fixture.debugElement.queryAll(By.css('thead th'));
    const colspan = fixture.debugElement.query(By.css('.empty-state')).nativeElement.getAttribute('colspan');
    expect(Number(colspan)).toBe(headers.length);
  });

  it('should render view detail link pointing to student profile', () => {
    const viewDetailBtn = fixture.debugElement.query(By.css('.btn-view-detail'));
    expect(viewDetailBtn.nativeElement.getAttribute('href')).toBe('/students/SV001');
  });

  it('should hide action column and buttons when user cannot manage students', async () => {
    await TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [StudentTable],
      providers: [
        provideRouter([]),
        {
          provide: AuthFacade,
          useValue: {
            can: vi.fn(() => false)
          }
        }
      ]
    }).compileComponents();

    const noAuthFixture = TestBed.createComponent(StudentTable);
    noAuthFixture.componentRef.setInput('students', mockStudents);
    noAuthFixture.detectChanges();
    await noAuthFixture.whenStable();

    const actionHeader = noAuthFixture.debugElement.query(By.css('.actions-header'));
    expect(actionHeader).toBeNull();

    noAuthFixture.componentRef.setInput('students', []);
    noAuthFixture.detectChanges();
    const noAuthHeaders = noAuthFixture.debugElement.queryAll(By.css('thead th'));
    const noAuthColspan = noAuthFixture.debugElement.query(By.css('.empty-state')).nativeElement.getAttribute('colspan');
    expect(Number(noAuthColspan)).toBe(noAuthHeaders.length);

    const actionCells = noAuthFixture.debugElement.queryAll(By.css('.col-actions'));
    expect(actionCells.length).toBe(0);
  });
});
