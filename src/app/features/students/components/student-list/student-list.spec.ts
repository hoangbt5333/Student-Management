import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { of } from 'rxjs';
import { StudentService } from '../../data-access/student';
import type { Student } from '../../data-access/student';
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

  it('should clear the form after a student is added successfully', () => {
    const form = fixture.debugElement.query(By.directive(StudentForm)).injector.get(StudentForm);
    const student = {
      id: 'SV01',
      name: 'Nguyễn Bình',
      email: 'binh@example.com',
      phone: '0123456789',
    };

    form.form.setValue(student);
    component.saveStudent(student);

    expect(form.form.getRawValue()).toEqual({
      id: '',
      name: '',
      email: '',
      phone: '',
    });
  });
});
