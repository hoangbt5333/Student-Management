import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { By } from '@angular/platform-browser';
import { DashboardComponent } from './dashboard';
import { StudentFacade } from '../../../students/facades/student.facade';
import { ClassFacade } from '../../../classes/facades/class.facade';
import type { Student } from '../../../students/models/student.model';
import type { ClassModel } from '../../../classes/models/class.model';

describe('DashboardComponent', () => {
  let component: DashboardComponent;
  let fixture: ComponentFixture<DashboardComponent>;

  let mockStudentsSignal = signal<Student[]>([]);
  let mockClassesSignal = signal<ClassModel[]>([]);
  let mockStudentLoading = signal<boolean>(false);
  let mockClassLoading = signal<boolean>(false);
  let mockStudentError = signal<string | null>(null);
  let mockClassError = signal<string | null>(null);

  const mockLoadStudents = vi.fn();
  const mockLoadClasses = vi.fn();

  beforeEach(async () => {
    mockStudentsSignal = signal<Student[]>([
      {
        id: 'S1',
        name: 'Nguyen Van A',
        email: 'a@example.com',
        phone: '0123456789',
        classId: 'C1',
        className: 'CNTT-K1',
        faculty: 'CNTT',
      },
      {
        id: 'S2',
        name: 'Tran Thi B',
        email: 'b@example.com',
        phone: '0987654321',
        classId: 'C1',
        className: 'CNTT-K1',
        faculty: 'CNTT',
      },
      {
        id: 'S3',
        name: 'Le Van C',
        email: 'c@example.com',
        phone: '0912345678',
        classId: 'C2',
        className: 'KT-K1',
        faculty: 'Kinh te',
      },
    ]);

    mockClassesSignal = signal<ClassModel[]>([
      {
        id: 'C1',
        code: 'CNTT01',
        name: 'CNTT-K1',
        department: 'CNTT',
        academicYear: '2024-2025',
      },
      {
        id: 'C2',
        code: 'KT01',
        name: 'KT-K1',
        department: 'Kinh te',
        academicYear: '2024-2025',
      },
      {
        id: 'C3',
        code: 'NN01',
        name: 'NN-K1',
        department: 'Ngoai ngu',
        academicYear: '2024-2025',
      },
    ]);

    mockStudentLoading = signal<boolean>(false);
    mockClassLoading = signal<boolean>(false);
    mockStudentError = signal<string | null>(null);
    mockClassError = signal<string | null>(null);

    await TestBed.configureTestingModule({
      imports: [DashboardComponent],
      providers: [
        provideRouter([]),
        {
          provide: StudentFacade,
          useValue: {
            students: mockStudentsSignal,
            loading: mockStudentLoading,
            errorMessage: mockStudentError,
            loadStudents: mockLoadStudents,
          },
        },
        {
          provide: ClassFacade,
          useValue: {
            classes: mockClassesSignal,
            loading: mockClassLoading,
            errorMessage: mockClassError,
            loadClasses: mockLoadClasses,
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create the dashboard component', () => {
    expect(component).toBeTruthy();
  });

  it('should call loadStudents and loadClasses on initialization', () => {
    expect(mockLoadStudents).toHaveBeenCalled();
    expect(mockLoadClasses).toHaveBeenCalled();
  });

  it('should compute statistics accurately from facades', () => {
    const stats = component.stats();
    expect(stats.totalStudents).toBe(3);
    expect(stats.totalClasses).toBe(3);
    expect(stats.averageStudentsPerClass).toBe('1.0');
    expect(stats.topClass?.name).toBe('CNTT-K1');
    expect(stats.topClass?.studentCount).toBe(2);
    expect(stats.inactiveClasses.length).toBe(1);
    expect(stats.inactiveClasses[0].name).toBe('NN-K1');
  });

  it('should render metric card values into the DOM', () => {
    const metricValues = fixture.debugElement.queryAll(By.css('.metric-value'));
    expect(metricValues.length).toBe(4);
    expect(metricValues[0].nativeElement.textContent.trim()).toBe('3');
    expect(metricValues[1].nativeElement.textContent.trim()).toBe('3');
    expect(metricValues[2].nativeElement.textContent.trim()).toBe('1.0');
    expect(metricValues[3].nativeElement.textContent.trim()).toBe('1');
  });

  it('should render table rows for class statistics', () => {
    const rows = fixture.debugElement.queryAll(By.css('.data-table tbody tr'));
    expect(rows.length).toBe(3);
  });

  it('should trigger refresh when refresh button is clicked', () => {
    mockLoadStudents.mockClear();
    mockLoadClasses.mockClear();

    const refreshButton = fixture.debugElement.query(By.css('button.btn-secondary'));
    expect(refreshButton).toBeTruthy();
    refreshButton.nativeElement.click();

    expect(mockLoadStudents).toHaveBeenCalledTimes(1);
    expect(mockLoadClasses).toHaveBeenCalledTimes(1);
  });

  it('should handle zero classes gracefully without NaN average', () => {
    mockClassesSignal.set([]);
    mockStudentsSignal.set([]);
    fixture.detectChanges();

    const stats = component.stats();
    expect(stats.totalStudents).toBe(0);
    expect(stats.totalClasses).toBe(0);
    expect(stats.averageStudentsPerClass).toBe('0.0');
    expect(stats.topClass).toBeUndefined();
    expect(stats.inactiveClasses.length).toBe(0);

    const emptyState = fixture.debugElement.query(By.css('.empty-state'));
    expect(emptyState).toBeTruthy();
  });
});
