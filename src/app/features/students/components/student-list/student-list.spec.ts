import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { of } from 'rxjs';
import { StudentService } from '../../services/student.service';
import type { Student } from '../../models/student.model';
import { StudentForm } from '../../components/student-form/student-form';
import { StudentListComponent } from './student-list';
import { AuthFacade } from '../../../../core/auth/facades/auth.facade';
import { ClassService } from '../../../classes/services/class.service';

describe('StudentList', () => {
  let component: StudentListComponent;
  let fixture: ComponentFixture<StudentListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StudentListComponent],
      providers: [
        {
          provide: StudentService,
          useValue: {
            getStudents: () => of([]),
            addStudent: (student: Student) => of(student),
          },
        },
        {
          provide: ClassService,
          useValue: {
            getAll: () => of([]),
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

    fixture = TestBed.createComponent(StudentListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('shows the student form only after clicking the add button', () => {
    expect(fixture.debugElement.query(By.directive(StudentForm))).toBeNull();

    const addButton = fixture.nativeElement.querySelector('button.primary-button') as HTMLButtonElement;
    addButton.click();
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.directive(StudentForm))).not.toBeNull();
  });

  it('closes the form when adding is canceled', () => {
    component.openAddStudent();
    fixture.detectChanges();

    component.cancelEdit();
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.directive(StudentForm))).toBeNull();
  });

  it('should clear the form after a student is added successfully', async () => {
    component.openAddStudent();
    fixture.detectChanges();
    const form = fixture.debugElement.query(By.directive(StudentForm)).injector.get(StudentForm);
    const student = {
      id: 'SV01',
      name: 'Nguyễn Bình',
      email: 'binh@example.com',
      phone: '0123456789',
      classId: '',
      className: 'CTK42',
      faculty: 'Công nghệ thông tin',
    };

    form.form.setValue({
      id: student.id,
      name: student.name,
      email: student.email,
      phone: student.phone,
      classId: student.classId ?? '',
      faculty: student.faculty ?? '',
    });
    component.saveStudent(student);
    await fixture.whenStable();

    expect(form.form.getRawValue()).toEqual({
      id: '',
      name: '',
      email: '',
      phone: '',
      classId: '',
      faculty: '',
    });
    expect(component.showForm()).toBe(false);
  });
  it('debounces search input by 300ms before calling facade.setSearchTerm', () => {
    vi.useFakeTimers();
    try {
      const setSearchTermSpy = vi.spyOn(component.facade, 'setSearchTerm');
      component.searchControl.setValue('Nguyen');
      expect(setSearchTermSpy).not.toHaveBeenCalled();

      vi.advanceTimersByTime(299);
      expect(setSearchTermSpy).not.toHaveBeenCalled();

      vi.advanceTimersByTime(1);
      expect(setSearchTermSpy).toHaveBeenCalledWith('Nguyen');
    } finally {
      vi.useRealTimers();
    }
  });


  it('warns and blocks closing form when form has unsaved changes and user cancels confirm', () => {
    component.openAddStudent();
    fixture.detectChanges();

    const formComp = fixture.debugElement.query(By.directive(StudentForm)).componentInstance as StudentForm;
    formComp.form.controls.name.setValue('New Student Name');
    formComp.form.markAsDirty();
    fixture.detectChanges();

    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);

    component.cancelEdit();
    fixture.detectChanges();

    expect(confirmSpy).toHaveBeenCalled();
    expect(component.showForm()).toBe(true);
  });

  it('allows closing form when form has unsaved changes and user confirms', () => {
    component.openAddStudent();
    fixture.detectChanges();

    const formComp = fixture.debugElement.query(By.directive(StudentForm)).componentInstance as StudentForm;
    formComp.form.controls.name.setValue('New Student Name');
    formComp.form.markAsDirty();
    fixture.detectChanges();

    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

    component.cancelEdit();
    fixture.detectChanges();

    expect(confirmSpy).toHaveBeenCalled();
    expect(component.showForm()).toBe(false);
  });
});