import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, ActivatedRoute } from '@angular/router';
import { signal } from '@angular/core';
import { By } from '@angular/platform-browser';
import { SubjectDetailComponent } from './subject-detail';
import { SubjectFacade } from '../../facades/subject.facade';
import { TeacherFacade } from '../../../teachers/facades/teacher.facade';
import { GradeFacade } from '../../../grades/facades/grade.facade';
import type { Subject } from '../../models/subject.model';
import type { Teacher } from '../../../teachers/models/teacher.model';
import type { Grade } from '../../../grades/models/grade.model';

describe('SubjectDetailComponent', () => {
  let component: SubjectDetailComponent;
  let fixture: ComponentFixture<SubjectDetailComponent>;

  const mockSubjectsSignal = signal<Subject[]>([
    {
      id: 'MH001',
      code: 'MH001',
      name: 'Lap trinh Web',
      credits: 3,
      teacherId: 'GV001',
    },
  ]);

  const mockTeachersSignal = signal<Teacher[]>([
    {
      id: 'GV001',
      code: 'GV001',
      name: 'Nguyen Van B',
      email: 'b@university.edu.vn',
      department: 'Khoa hoc may tinh',
    },
  ]);

  const mockGradesSignal = signal<Grade[]>([
    {
      id: 'D001',
      studentId: 'SV001',
      subjectId: 'MH001',
      score: 8.5,
    },
    {
      id: 'D002',
      studentId: 'SV002',
      subjectId: 'MH001',
      score: 9.0,
    },
  ]);

  const mockLoadSubjects = vi.fn();
  const mockLoadTeachers = vi.fn();
  const mockLoadGrades = vi.fn();

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SubjectDetailComponent],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: {
                get: (key: string) => (key === 'id' ? 'MH001' : null),
              },
            },
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
        {
          provide: TeacherFacade,
          useValue: {
            teachers: mockTeachersSignal,
            loading: signal(false),
            errorMessage: signal(null),
            loadTeachers: mockLoadTeachers,
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
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SubjectDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create the subject detail component', () => {
    expect(component).toBeTruthy();
  });

  it('should load subjects, teachers, and grades on init', () => {
    expect(mockLoadSubjects).toHaveBeenCalled();
    expect(mockLoadTeachers).toHaveBeenCalled();
    expect(mockLoadGrades).toHaveBeenCalled();
  });

  it('should resolve subject, teacher, and grade count', () => {
    expect(component.subject()?.name).toBe('Lap trinh Web');
    expect(component.teacher()?.name).toBe('Nguyen Van B');
    expect(component.gradeCount()).toBe(2);
  });

  it('should render subject details and teacher link in the template', () => {
    const heading = fixture.debugElement.query(By.css('h1'));
    expect(heading.nativeElement.textContent.trim()).toBe('Lap trinh Web');

    const teacherLink = fixture.debugElement.query(By.css('.teacher-link'));
    expect(teacherLink.nativeElement.textContent).toContain('Nguyen Van B');

    const scoreValue = fixture.debugElement.query(By.css('.metric-card .score'));
    expect(scoreValue.nativeElement.textContent.trim()).toBe('2');
  });
});
