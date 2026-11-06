import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { By } from '@angular/platform-browser';
import { ClassList } from './class-list';
import { ClassService } from '../../services/class.service';
import { StudentService } from '../../../students/services/student.service';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';
import { ClassForm } from '../class-form/class-form';
import type { ClassModel } from '../../models/class.model';

describe('ClassList', () => {
  let component: ClassList;
  let fixture: ComponentFixture<ClassList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ClassList],
      providers: [
        provideRouter([]),
        {
          provide: ClassService,
          useValue: {
            getAll: () => of([]),
          },
        },
        {
          provide: StudentService,
          useValue: {
            getStudents: () => of([]),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ClassList);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should not display modal initially', () => {
    fixture.detectChanges();
    expect(fixture.debugElement.query(By.directive(ModalComponent))).toBeNull();
  });

  it('should render pagination component', () => {
    fixture.detectChanges();
    const paginationDe = fixture.debugElement.query(By.directive(PaginationComponent));
    expect(paginationDe).not.toBeNull();
  });

  it('should delegate page and pageSize changes to facade', () => {
    const setPageSpy = vi.spyOn(component.facade, 'setPage');
    const setPageSizeSpy = vi.spyOn(component.facade, 'setPageSize');

    component.onPageChange(2);
    expect(setPageSpy).toHaveBeenCalledWith(2);

    component.onPageSizeChange(10);
    expect(setPageSizeSpy).toHaveBeenCalledWith(10);
  });

  it('should show modal with add class title when openAddForm is called', () => {
    component.openAddForm();
    fixture.detectChanges();

    const modalDe = fixture.debugElement.query(By.directive(ModalComponent));
    expect(modalDe).not.toBeNull();
    const modalComp = modalDe.componentInstance as ModalComponent;
    expect(modalComp.title()).toBe('Thêm lớp học mới');
    expect(fixture.debugElement.query(By.directive(ClassForm))).not.toBeNull();
  });

  it('should show modal with edit class title and data when openEditForm is called', () => {
    const mockClass: ClassModel = {
      id: 'CLS001',
      code: 'CLS001',
      name: 'CNTT-K68-01',
      department: 'Công nghệ thông tin',
      academicYear: '2025-2026'
    };

    component.openEditForm(mockClass);
    fixture.detectChanges();

    const modalDe = fixture.debugElement.query(By.directive(ModalComponent));
    expect(modalDe).not.toBeNull();
    const modalComp = modalDe.componentInstance as ModalComponent;
    expect(modalComp.title()).toBe('Cập nhật lớp học');
    expect(component.editingClass()).toEqual(mockClass);
  });

  it('should close modal when closeForm is called', () => {
    component.openAddForm();
    fixture.detectChanges();
    expect(fixture.debugElement.query(By.directive(ModalComponent))).not.toBeNull();

    component.closeForm();
    fixture.detectChanges();
    expect(fixture.debugElement.query(By.directive(ModalComponent))).toBeNull();
    expect(component.editingClass()).toBeNull();
  });
  it('debounces search input by 300ms before calling facade.setSearchTerm', () => {
    vi.useFakeTimers();
    try {
      const setSearchTermSpy = vi.spyOn(component.facade, 'setSearchTerm');
      component.searchControl.setValue('CNTT');
      expect(setSearchTermSpy).not.toHaveBeenCalled();

      vi.advanceTimersByTime(299);
      expect(setSearchTermSpy).not.toHaveBeenCalled();

      vi.advanceTimersByTime(1);
      expect(setSearchTermSpy).toHaveBeenCalledWith('CNTT');
    } finally {
      vi.useRealTimers();
    }
  });


  it('warns and blocks closing form when form has unsaved changes and user cancels confirm', () => {
    component.openAddForm();
    fixture.detectChanges();

    const formComp = fixture.debugElement.query(By.directive(ClassForm)).componentInstance as ClassForm;
    formComp.form.controls.name.setValue('New Class Name');
    formComp.form.markAsDirty();
    fixture.detectChanges();

    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);

    component.closeForm();
    fixture.detectChanges();

    expect(confirmSpy).toHaveBeenCalled();
    expect(component.showForm()).toBe(true);
  });

  it('allows closing form when form has unsaved changes and user confirms', () => {
    component.openAddForm();
    fixture.detectChanges();

    const formComp = fixture.debugElement.query(By.directive(ClassForm)).componentInstance as ClassForm;
    formComp.form.controls.name.setValue('New Class Name');
    formComp.form.markAsDirty();
    fixture.detectChanges();

    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

    component.closeForm();
    fixture.detectChanges();

    expect(confirmSpy).toHaveBeenCalled();
    expect(component.showForm()).toBe(false);
  });
});