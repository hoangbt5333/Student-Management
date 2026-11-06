import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, ActivatedRoute } from '@angular/router';
import { signal } from '@angular/core';
import { By } from '@angular/platform-browser';
import { StudentDetailComponent } from './student-detail';
import { StudentFacade } from '../../facades/student.facade';
import { ClassFacade } from '../../../classes/facades/class.facade';
import { GradeFacade } from '../../../grades/facades/grade.facade';
import { SubjectFacade } from '../../../subjects/facades/subject.facade';
import type { Student } from '../../models/student.model';
import type { ClassModel } from '../../../classes/models/class.model';
import type { Grade } from '../../../grades/models/grade.model';
import type { Subject } from '../../../subjects/models/subject.model';

describe('StudentDetailComponent', () => {
  let component: StudentDetailComponent;
  let fixture: ComponentFixture<StudentDetailComponent>;

  const mockStudentsSignal = signal<Student[]>([
    {
      id: 'SV001',
      code: 'SV001',
      name: 'Nguyen Van A',
      email: 'a@example.com',
      phone: '0912345678',
      classId: 'CLS001',
      className: 'CNTT-K68-01',
      faculty: 'Cong nghe thong tin',
    },
  ]);

  const mockClassesSignal = signal<ClassModel[]>([
    {
      id: 'CLS001',
      code: 'CLS001',
      name: 'CNTT-K68-01',
      department: 'Cong nghe thong tin',
      academicYear: '2024-2025',
    },
  ]);

  const mockGradesSignal = signal<Grade[]>([
    {
      id: 'D001',
      studentId: 'SV001',
      subjectId: 'MH001',
      score: 8.5,
    },
  ]);

  const mockSubjectsSignal = signal<Subject[]>([
    {
      id: 'MH001',
      code: 'MH001',
      name: 'Lap trinh Web',
      credits: 3,
      teacherId: 'GV001',
    },
  ]);

  const mockLoadStudents = vi.fn();
  const mockLoadClasses = vi.fn();
  const mockLoadGrades = vi.fn();
  const mockLoadSubjects = vi.fn();

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StudentDetailComponent],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: {
                get: (key: string) => (key === 'id' ? 'SV001' : null),
              },
            },
          },
        },
        {
          provide: StudentFacade,
          useValue: {
            students: mockStudentsSignal,
            loading: signal(false),
            errorMessage: signal(null),
            loadStudents: mockLoadStudents,
          },
        },
        {
          provide: ClassFacade,
          useValue: {
            classes: mockClassesSignal,
            loading: signal(false),
            errorMessage: signal(null),
            loadClasses: mockLoadClasses,
          },
        },
        {
          provide: GradeFacade,
          useValue: {
            grades: mockGradesSignal,
            loading: signal(false),
            errorMessage: signal(null),
            loadGrades: mockLoadGrades,
          },
        },
        {
          provide: SubjectFacade,
          useValue: {
            subjects: mockSubjectsSignal,
            loading: signal(false),
            errorMessage: signal(null),
            loadSubjects: mockLoadSubjects,
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(StudentDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create the student detail component', () => {
    expect(component).toBeTruthy();
  });

  it('should load student data and dependencies on init', () => {
    expect(mockLoadStudents).toHaveBeenCalled();
    expect(mockLoadClasses).toHaveBeenCalled();
    expect(mockLoadGrades).toHaveBeenCalled();
    expect(mockLoadSubjects).toHaveBeenCalled();
  });

  it('should resolve student, classItem, grades, and average score', () => {
    expect(component.student()?.name).toBe('Nguyen Van A');
    expect(component.classItem()?.name).toBe('CNTT-K68-01');
    expect(component.grades().length).toBe(1);
    expect(component.average()).toBe('8.50');
  });

  it('should render student name in the template', () => {
    const heading = fixture.debugElement.query(By.css('h1'));
    expect(heading.nativeElement.textContent.trim()).toBe('Nguyen Van A');
  });

  it('should support signal input binding for id', () => {
    fixture.componentRef.setInput('id', 'SV001');
    fixture.detectChanges();
    expect(component.id()).toBe('SV001');
    expect(component.student()?.name).toBe('Nguyen Van A');
  });
});
