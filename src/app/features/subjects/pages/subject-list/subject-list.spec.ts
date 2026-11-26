import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { By } from '@angular/platform-browser';
import { SubjectListComponent } from './subject-list';
import { SubjectFacade } from '../../facades/subject.facade';
import { TeacherFacade } from '../../../teachers/facades/teacher.facade';
import { AuthFacade } from '../../../../core/auth/facades/auth.facade';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';
import type { Subject } from '../../models/subject.model';
import type { Teacher } from '../../../teachers/models/teacher.model';
import { UTF8_BOM } from '../../../../shared/utils/csv-export.util';

describe('SubjectListComponent', () => {
  let component: SubjectListComponent;
  let fixture: ComponentFixture<SubjectListComponent>;

  const mockSubjectsSignal = signal<Subject[]>([
    {
      id: 'MH001',
      code: 'MH001',
      name: 'Lap trinh Web',
      credits: 3,
      teacherId: 'GV001',
    },
  ]);

  const mockFilteredSubjectsSignal = signal<Subject[]>(mockSubjectsSignal());
  const mockPageSubjectsSignal = signal<Subject[]>(mockSubjectsSignal());

  const mockTeachersSignal = signal<Teacher[]>([
    {
      id: 'GV001',
      code: 'GV001',
      name: 'Nguyen Van B',
      email: 'b@university.edu.vn',
      department: 'Khoa hoc may tinh',
    },
  ]);

  const mockLoadSubjects = vi.fn();
  const mockLoadTeachers = vi.fn();
  const mockClearMessages = vi.fn();
  const mockSetSearchTerm = vi.fn();
  const mockSetPage = vi.fn();
  const mockSetPageSize = vi.fn();

  beforeEach(async () => {
    mockFilteredSubjectsSignal.set(mockSubjectsSignal());
    mockPageSubjectsSignal.set(mockSubjectsSignal());

    await TestBed.configureTestingModule({
      imports: [SubjectListComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: SubjectFacade,
          useValue: {
            subjects: mockSubjectsSignal,
            filteredSubjects: mockFilteredSubjectsSignal,
            pageSubjects: mockPageSubjectsSignal,
            filteredSubjectCount: signal(1),
            subjectCount: signal(1),
            page: signal(1),
            currentPage: signal(1),
            pageSize: signal(5),
            totalPages: signal(1),
            loading: signal(false),
            errorMessage: signal(null),
            successMessage: signal(null),
            loadSubjects: mockLoadSubjects,
            clearMessages: mockClearMessages,
            setSearchTerm: mockSetSearchTerm,
            setPage: mockSetPage,
            setPageSize: mockSetPageSize,
          },
        },
        {
          provide: TeacherFacade,
          useValue: {
            teachers: mockTeachersSignal,
            loadTeachers: mockLoadTeachers,
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

    fixture = TestBed.createComponent(SubjectListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create the subject list component', () => {
    expect(component).toBeTruthy();
  });

  it('should call loadSubjects and loadTeachers on init', () => {
    expect(mockLoadSubjects).toHaveBeenCalled();
    expect(mockLoadTeachers).toHaveBeenCalled();
  });

  it('should render subject rows in table', () => {
    const rows = fixture.debugElement.queryAll(By.css('.data-table tbody tr'));
    expect(rows.length).toBe(1);
    expect(rows[0].nativeElement.textContent).toContain('Lap trinh Web');
  });

  it('should render pagination component and delegate page and pageSize changes', () => {
    const paginationDe = fixture.debugElement.query(By.directive(PaginationComponent));
    expect(paginationDe).toBeTruthy();

    component.onPageChange(2);
    expect(mockSetPage).toHaveBeenCalledWith(2);

    component.onPageSizeChange(10);
    expect(mockSetPageSize).toHaveBeenCalledWith(10);
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
    expect(modalComp.title()).toBe('Thêm môn học mới');
  });

  it('should show modal with edit title and populate data on edit', () => {
    const subject = mockSubjectsSignal()[0];
    component.edit(subject);
    fixture.detectChanges();

    expect(component.showForm()).toBe(true);
    const modalDe = fixture.debugElement.query(By.directive(ModalComponent));
    expect(modalDe).toBeTruthy();
    const modalComp = modalDe.componentInstance as ModalComponent;
    expect(modalComp.title()).toBe('Cập nhật môn học');
    expect(component.editingId()).toBe('MH001');
    expect(component.form.getRawValue().name).toBe('Lap trinh Web');
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
      component.searchControl.setValue('Web');
      expect(mockSetSearchTerm).not.toHaveBeenCalled();

      vi.advanceTimersByTime(299);
      expect(mockSetSearchTerm).not.toHaveBeenCalled();

      vi.advanceTimersByTime(1);
      expect(mockSetSearchTerm).toHaveBeenCalledWith('Web');
    } finally {
      vi.useRealTimers();
    }
  });


  it('warns and blocks closing form when form has unsaved changes and user cancels confirm', () => {
    component.openAdd();
    component.form.controls.name.setValue('New Subject');
    component.form.markAsDirty();

    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);

    component.closeForm();

    expect(confirmSpy).toHaveBeenCalled();
    expect(component.showForm()).toBe(true);
  });

  it('allows closing form when form has unsaved changes and user confirms', () => {
    component.openAdd();
    component.form.controls.name.setValue('New Subject');
    component.form.markAsDirty();

    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

    component.closeForm();

    expect(confirmSpy).toHaveBeenCalled();
    expect(component.showForm()).toBe(false);
  });
  it('should render icon action buttons for detail, edit, and delete with svg and aria-labels', () => {
    const viewDetailBtn = fixture.debugElement.query(By.css('.btn-view-detail'));
    const editBtn = fixture.debugElement.query(By.css('.btn-edit-subject'));
    const deleteBtn = fixture.debugElement.query(By.css('.btn-delete-subject'));

    expect(viewDetailBtn).toBeTruthy();
    expect(editBtn).toBeTruthy();
    expect(deleteBtn).toBeTruthy();

    expect(viewDetailBtn.nativeElement.getAttribute('href')).toBe('/subjects/MH001');
    expect(viewDetailBtn.nativeElement.getAttribute('aria-label')).toContain('Lap trinh Web');
    expect(editBtn.nativeElement.getAttribute('aria-label')).toContain('Lap trinh Web');
    expect(deleteBtn.nativeElement.getAttribute('aria-label')).toContain('Lap trinh Web');

    expect(viewDetailBtn.query(By.css('svg.action-icon'))).toBeTruthy();
    expect(editBtn.query(By.css('svg.action-icon'))).toBeTruthy();
    expect(deleteBtn.query(By.css('svg.action-icon'))).toBeTruthy();
  });

  it('should open edit form when edit icon button is clicked', () => {
    const editBtn = fixture.debugElement.query(By.css('.btn-edit-subject'));
    editBtn.nativeElement.click();
    fixture.detectChanges();

    expect(component.showForm()).toBe(true);
    expect(component.editingId()).toBe('MH001');
  });

  it('should call delete method when delete icon button is clicked', () => {
    const deleteSpy = vi.spyOn(component, 'delete').mockImplementation(() => {});
    const deleteBtn = fixture.debugElement.query(By.css('.btn-delete-subject'));
    deleteBtn.nativeElement.click();

    expect(deleteSpy).toHaveBeenCalledWith(mockSubjectsSignal()[0]);
  });

  it('should only render view-detail button and hide edit/delete buttons when manage-subjects is denied', async () => {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [SubjectListComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: SubjectFacade,
          useValue: {
            subjects: mockSubjectsSignal,
            filteredSubjects: mockSubjectsSignal,
            pageSubjects: mockSubjectsSignal,
            filteredSubjectCount: signal(1),
            subjectCount: signal(1),
            page: signal(1),
            currentPage: signal(1),
            pageSize: signal(5),
            totalPages: signal(1),
            loading: signal(false),
            errorMessage: signal(null),
            successMessage: signal(null),
            loadSubjects: mockLoadSubjects,
            clearMessages: mockClearMessages,
            setSearchTerm: mockSetSearchTerm,
            setPage: mockSetPage,
            setPageSize: mockSetPageSize,
          },
        },
        {
          provide: TeacherFacade,
          useValue: {
            teachers: mockTeachersSignal,
            loadTeachers: mockLoadTeachers,
          },
        },
        {
          provide: AuthFacade,
          useValue: {
            can: (perm: string) => perm !== 'manage-subjects',
          },
        },
      ],
    }).compileComponents();

    const unauthFixture = TestBed.createComponent(SubjectListComponent);
    unauthFixture.detectChanges();
    await unauthFixture.whenStable();

    expect(unauthFixture.debugElement.query(By.css('.btn-export-csv'))).toBeTruthy();
    expect(unauthFixture.debugElement.query(By.css('.btn-view-detail'))).toBeTruthy();
    expect(unauthFixture.debugElement.query(By.css('.btn-edit-subject'))).toBeNull();
    expect(unauthFixture.debugElement.query(By.css('.btn-delete-subject'))).toBeNull();
  });

  describe('CSV export', () => {
    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('should render .btn-export-csv with text "Xuất CSV" and call exportCsv() on click', () => {
      const exportBtn = fixture.debugElement.query(By.css('.page-header-actions .btn-export-csv'));
      expect(exportBtn).toBeTruthy();
      expect(exportBtn.nativeElement.textContent.trim()).toBe('Xuất CSV');

      const exportSpy = vi.spyOn(component, 'exportCsv').mockImplementation(() => undefined);
      exportBtn.nativeElement.click();

      expect(exportSpy).toHaveBeenCalledOnce();
    });

    it('should export all filteredSubjects (not only pageSubjects), map teacher names with "Chưa phân công" fallback, create UTF-8 BOM Blob, download subjects.csv, and revoke object URL', async () => {
      const filteredSubjects: Subject[] = [
        {
          id: 'MH001',
          code: 'MH001',
          name: 'Lap trinh Web',
          credits: 3,
          teacherId: 'GV001',
        },
        {
          id: 'MH002',
          name: 'Co so du lieu',
          credits: 4,
        },
      ];
      mockFilteredSubjectsSignal.set(filteredSubjects);
      mockPageSubjectsSignal.set([filteredSubjects[0]]);
      fixture.detectChanges();

      const createObjectURL = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:subjects-csv');
      const revokeObjectURL = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
      const originalCreateElement = document.createElement.bind(document);
      const anchor = originalCreateElement('a');
      const clickSpy = vi.spyOn(anchor, 'click').mockImplementation(() => undefined);
      vi.spyOn(document, 'createElement').mockImplementation((tagName: string) =>
        tagName === 'a' ? anchor : originalCreateElement(tagName),
      );

      const exportBtn = fixture.debugElement.query(By.css('.btn-export-csv'));
      exportBtn.nativeElement.click();

      expect(createObjectURL).toHaveBeenCalledOnce();
      const blob = createObjectURL.mock.calls[0][0] as Blob;
      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe('text/csv;charset=utf-8');

      const csvText = new TextDecoder('utf-8', { ignoreBOM: true }).decode(await blob.arrayBuffer());
      expect(csvText.startsWith(UTF8_BOM)).toBe(true);
      expect(csvText).toBe(
        UTF8_BOM +
          [
            'Mã môn,Tên môn học,Số tín chỉ,Giảng viên phụ trách',
            'MH001,Lap trinh Web,3,Nguyen Van B',
            'MH002,Co so du lieu,4,Chưa phân công',
          ].join('\r\n'),
      );

      expect(anchor.download).toBe('subjects.csv');
      expect(clickSpy).toHaveBeenCalledOnce();
      expect(revokeObjectURL).toHaveBeenCalledWith('blob:subjects-csv');
    });
  });
});
