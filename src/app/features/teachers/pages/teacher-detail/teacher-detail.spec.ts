import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, ActivatedRoute } from '@angular/router';
import { signal } from '@angular/core';
import { By } from '@angular/platform-browser';
import { TeacherDetailComponent } from './teacher-detail';
import { TeacherFacade } from '../../facades/teacher.facade';
import { SubjectFacade } from '../../../subjects/facades/subject.facade';
import type { Teacher } from '../../models/teacher.model';
import type { Subject } from '../../../subjects/models/subject.model';

describe('TeacherDetailComponent', () => {
  let component: TeacherDetailComponent;
  let fixture: ComponentFixture<TeacherDetailComponent>;

  const mockTeachersSignal = signal<Teacher[]>([
    {
      id: 'GV001',
      code: 'GV001',
      name: 'Nguyen Van B',
      email: 'b@university.edu.vn',
      department: 'Khoa hoc may tinh',
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

  const mockLoadTeachers = vi.fn();
  const mockLoadSubjects = vi.fn();

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TeacherDetailComponent],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: {
                get: (key: string) => (key === 'id' ? 'GV001' : null),
              },
            },
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

    fixture = TestBed.createComponent(TeacherDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create the teacher detail component', () => {
    expect(component).toBeTruthy();
  });

  it('should load teacher and subjects on init', () => {
    expect(mockLoadTeachers).toHaveBeenCalled();
    expect(mockLoadSubjects).toHaveBeenCalled();
  });

  it('should resolve teacher data and assigned subjects', () => {
    expect(component.teacher()?.name).toBe('Nguyen Van B');
    expect(component.subjects().length).toBe(1);
    expect(component.subjects()[0].name).toBe('Lap trinh Web');
  });

  it('should render teacher name and subjects in the template', () => {
    const heading = fixture.debugElement.query(By.css('h1'));
    expect(heading.nativeElement.textContent.trim()).toBe('Nguyen Van B');

    const subjectRows = fixture.debugElement.queryAll(By.css('.data-table tbody tr'));
    expect(subjectRows.length).toBe(1);
  });

  it('should support signal input binding for id', () => {
    fixture.componentRef.setInput('id', 'GV001');
    fixture.detectChanges();
    expect(component.id()).toBe('GV001');
    expect(component.teacher()?.name).toBe('Nguyen Van B');
  });
});
