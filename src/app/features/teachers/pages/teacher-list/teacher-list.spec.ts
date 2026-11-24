import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { By } from '@angular/platform-browser';
import { TeacherListComponent } from './teacher-list';
import { TeacherFacade } from '../../facades/teacher.facade';
import { AuthFacade } from '../../../../core/auth/facades/auth.facade';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import type { Teacher } from '../../models/teacher.model';

describe('TeacherListComponent', () => {
  let component: TeacherListComponent;
  let fixture: ComponentFixture<TeacherListComponent>;

  const mockTeachersSignal = signal<Teacher[]>([
    {
      id: 'GV001',
      code: 'GV001',
      name: 'Nguyen Van B',
      email: 'b@university.edu.vn',
      department: 'Khoa hoc may tinh',
    },
  ]);

  const mockLoadTeachers = vi.fn();
  const mockClearMessages = vi.fn();
  const mockSetSearchTerm = vi.fn();
  const mockPageTeachersSignal = signal<Teacher[]>(mockTeachersSignal());
  const mockFilteredTeacherCountSignal = signal(1);
  const mockCurrentPageSignal = signal(1);
  const mockPageSizeSignal = signal(5);
  const mockSetPage = vi.fn();
  const mockSetPageSize = vi.fn();

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TeacherListComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: TeacherFacade,
          useValue: {
            teachers: mockTeachersSignal,
            filteredTeachers: mockTeachersSignal,
            pageTeachers: mockPageTeachersSignal,
            filteredTeacherCount: mockFilteredTeacherCountSignal,
            currentPage: mockCurrentPageSignal,
            pageSize: mockPageSizeSignal,
            loading: signal(false),
            errorMessage: signal(null),
            successMessage: signal(null),
            loadTeachers: mockLoadTeachers,
            clearMessages: mockClearMessages,
            setSearchTerm: mockSetSearchTerm,
            setPage: mockSetPage,
            setPageSize: mockSetPageSize,
          },
        },
        {
          provide: AuthFacade,
          useValue: {
            can: () => true,
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TeacherListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create the teacher list component', () => {
    expect(component).toBeTruthy();
  });

  it('should call loadTeachers on initialization', () => {
    expect(mockLoadTeachers).toHaveBeenCalled();
  });

  it('should render teachers table rows', () => {
    const rows = fixture.debugElement.queryAll(By.css('.data-table tbody tr'));
    expect(rows.length).toBe(1);
    expect(rows[0].nativeElement.textContent).toContain('Nguyen Van B');
  });

  it('should render shared pagination and forward page changes', () => {
    const pagination = fixture.debugElement.query(By.css('app-pagination'));
    expect(pagination).toBeTruthy();
    expect(pagination.nativeElement.textContent).toContain('giảng viên');

    component.onPageChange(2);
    component.onPageSizeChange(20);
    expect(mockSetPage).toHaveBeenCalledWith(2);
    expect(mockSetPageSize).toHaveBeenCalledWith(20);
  });

  it('should toggle form visibility on add button click', () => {
    expect(component.showForm()).toBe(false);
    const addButton = fixture.debugElement.query(By.css('button.primary-button'));
    expect(addButton).toBeTruthy();
    addButton.nativeElement.click();
    fixture.detectChanges();

    expect(component.showForm()).toBe(true);
    expect(fixture.debugElement.query(By.css('.form-card'))).toBeTruthy();
    expect(fixture.debugElement.query(By.directive(ModalComponent))).toBeTruthy();
    const modalComp = fixture.debugElement.query(By.directive(ModalComponent)).componentInstance as ModalComponent;
    expect(modalComp.title()).toBe('Thêm giảng viên mới');
  });

  it('should show modal with edit title and populate data on edit', () => {
    const teacher = mockTeachersSignal()[0];
    component.edit(teacher);
    fixture.detectChanges();

    expect(component.showForm()).toBe(true);
    const modalDe = fixture.debugElement.query(By.directive(ModalComponent));
    expect(modalDe).toBeTruthy();
    const modalComp = modalDe.componentInstance as ModalComponent;
    expect(modalComp.title()).toBe('Cập nhật giảng viên');
    expect(component.editingId()).toBe('GV001');
    expect(component.form.getRawValue().name).toBe('Nguyen Van B');
  });

  it('should close modal when closeForm is called', () => {
    component.openAdd();
    fixture.detectChanges();
    expect(fixture.debugElement.query(By.directive(ModalComponent))).toBeTruthy();

    component.closeForm();
    fixture.detectChanges();
    expect(component.showForm()).toBe(false);
    expect(fixture.debugElement.query(By.directive(ModalComponent))).toBeNull();
  });
  it('debounces search input by 300ms before calling facade.setSearchTerm', () => {
    vi.useFakeTimers();
    try {
      component.searchControl.setValue('An');
      expect(mockSetSearchTerm).not.toHaveBeenCalled();

      vi.advanceTimersByTime(299);
      expect(mockSetSearchTerm).not.toHaveBeenCalled();

      vi.advanceTimersByTime(1);
      expect(mockSetSearchTerm).toHaveBeenCalledWith('An');
    } finally {
      vi.useRealTimers();
    }
  });


  it('warns and blocks closing form when form has unsaved changes and user cancels confirm', () => {
    component.openAdd();
    component.form.controls.name.setValue('New Teacher');
    component.form.markAsDirty();

    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);

    component.closeForm();

    expect(confirmSpy).toHaveBeenCalled();
    expect(component.showForm()).toBe(true);
  });

  it('allows closing form when form has unsaved changes and user confirms', () => {
    component.openAdd();
    component.form.controls.name.setValue('New Teacher');
    component.form.markAsDirty();

    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

    component.closeForm();

    expect(confirmSpy).toHaveBeenCalled();
    expect(component.showForm()).toBe(false);
  });
  it('should render icon action buttons for detail, edit, and delete with svg and aria-labels', () => {
    const viewDetailBtn = fixture.debugElement.query(By.css('.btn-view-detail'));
    const editBtn = fixture.debugElement.query(By.css('.btn-edit-teacher'));
    const deleteBtn = fixture.debugElement.query(By.css('.btn-delete-teacher'));

    expect(viewDetailBtn).toBeTruthy();
    expect(editBtn).toBeTruthy();
    expect(deleteBtn).toBeTruthy();

    expect(viewDetailBtn.nativeElement.getAttribute('href')).toBe('/teachers/GV001');
    expect(viewDetailBtn.nativeElement.getAttribute('aria-label')).toContain('Nguyen Van B');
    expect(editBtn.nativeElement.getAttribute('aria-label')).toContain('Nguyen Van B');
    expect(deleteBtn.nativeElement.getAttribute('aria-label')).toContain('Nguyen Van B');

    expect(viewDetailBtn.query(By.css('svg.action-icon'))).toBeTruthy();
    expect(editBtn.query(By.css('svg.action-icon'))).toBeTruthy();
    expect(deleteBtn.query(By.css('svg.action-icon'))).toBeTruthy();
  });

  it('should open edit form when edit icon button is clicked', () => {
    const editBtn = fixture.debugElement.query(By.css('.btn-edit-teacher'));
    editBtn.nativeElement.click();
    fixture.detectChanges();

    expect(component.showForm()).toBe(true);
    expect(component.editingId()).toBe('GV001');
  });

  it('should call delete method when delete icon button is clicked', () => {
    const deleteSpy = vi.spyOn(component, 'delete').mockImplementation(() => {});
    const deleteBtn = fixture.debugElement.query(By.css('.btn-delete-teacher'));
    deleteBtn.nativeElement.click();

    expect(deleteSpy).toHaveBeenCalledWith(mockTeachersSignal()[0]);
  });

  it('should only render view-detail button and hide edit/delete buttons when manage-teachers is denied', async () => {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [TeacherListComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: TeacherFacade,
          useValue: {
            teachers: mockTeachersSignal,
            filteredTeachers: mockTeachersSignal,
            pageTeachers: mockPageTeachersSignal,
            filteredTeacherCount: mockFilteredTeacherCountSignal,
            currentPage: mockCurrentPageSignal,
            pageSize: mockPageSizeSignal,
            loading: signal(false),
            errorMessage: signal(null),
            successMessage: signal(null),
            loadTeachers: mockLoadTeachers,
            clearMessages: mockClearMessages,
            setSearchTerm: mockSetSearchTerm,
            setPage: mockSetPage,
            setPageSize: mockSetPageSize,
          },
        },
        {
          provide: AuthFacade,
          useValue: {
            can: (perm: string) => perm !== 'manage-teachers',
          },
        },
      ],
    }).compileComponents();

    const unauthFixture = TestBed.createComponent(TeacherListComponent);
    unauthFixture.detectChanges();
    await unauthFixture.whenStable();

    expect(unauthFixture.debugElement.query(By.css('.btn-view-detail'))).toBeTruthy();
    expect(unauthFixture.debugElement.query(By.css('.btn-edit-teacher'))).toBeNull();
    expect(unauthFixture.debugElement.query(By.css('.btn-delete-teacher'))).toBeNull();
  });
});
