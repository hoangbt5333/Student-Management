import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { By } from '@angular/platform-browser';
import { TeacherListComponent } from './teacher-list';
import { TeacherFacade } from '../../facades/teacher.facade';
import { AuthFacade } from '../../../../core/auth/facades/auth.facade';
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
            loading: signal(false),
            errorMessage: signal(null),
            successMessage: signal(null),
            loadTeachers: mockLoadTeachers,
            clearMessages: mockClearMessages,
            setSearchTerm: mockSetSearchTerm,
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
