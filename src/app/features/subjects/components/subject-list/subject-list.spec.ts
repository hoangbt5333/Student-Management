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
import type { Subject } from '../../models/subject.model';
import type { Teacher } from '../../../teachers/models/teacher.model';

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

  beforeEach(async () => {
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
            loading: signal(false),
            errorMessage: signal(null),
            successMessage: signal(null),
            loadSubjects: mockLoadSubjects,
            clearMessages: mockClearMessages,
            setSearchTerm: mockSetSearchTerm,
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

  it('should toggle form visibility on add button click', () => {
    expect(component.showForm()).toBe(false);
    const addButton = fixture.debugElement.query(By.css('button.primary-button'));
    expect(addButton).toBeTruthy();
    addButton.nativeElement.click();
    fixture.detectChanges();

    expect(component.showForm()).toBe(true);
    expect(fixture.debugElement.query(By.css('.form-card'))).toBeTruthy();
  });
});
