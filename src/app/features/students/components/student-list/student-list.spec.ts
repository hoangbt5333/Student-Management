import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { of } from 'rxjs';
import { StudentService } from '../../data-access/student';
import type { Student } from '../../data-access/models/student.model';
import { StudentForm } from '../../components/student-form/student-form';
import { StudentListComponent } from './student-list';

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

    const addButton = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
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

  // it('should match Vietnamese names without typing their diacritics', () => {
  //   const student = {
  //     id: 'SV01',
  //     name: 'Nguyễn Bình',
  //     email: 'binh@example.com',
  //     phone: '0123456789',
  //   };

  //   component.students.set([student]);
  //   component.searchTerm.set('bi');

  //   expect(component.filteredStudents()).toEqual([student]);
  // });

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
});
