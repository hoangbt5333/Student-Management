import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, ActivatedRoute } from '@angular/router';
import { signal } from '@angular/core';
import { By } from '@angular/platform-browser';
import { ClassDetailComponent } from './class-detail';
import { ClassFacade } from '../../facades/class.facade';
import { StudentFacade } from '../../../students/facades/student.facade';
import type { ClassModel } from '../../models/class.model';
import type { Student } from '../../../students/models/student.model';

describe('ClassDetailComponent', () => {
  let component: ClassDetailComponent;
  let fixture: ComponentFixture<ClassDetailComponent>;

  const mockClassesSignal = signal<ClassModel[]>([
    {
      id: 'CLS001',
      code: 'CLS001',
      name: 'CNTT-K68-01',
      department: 'Công nghệ thông tin',
      academicYear: '2024-2025',
    },
  ]);

  const mockStudentsSignal = signal<Student[]>([
    {
      id: 'SV001',
      name: 'Nguyen Van A',
      email: 'a@example.com',
      phone: '0912345678',
      classId: 'CLS001',
      className: 'CNTT-K68-01',
      faculty: 'Công nghệ thông tin',
    },
  ]);

  const mockLoadClasses = vi.fn();
  const mockLoadStudents = vi.fn();

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ClassDetailComponent],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: {
                get: (key: string) => (key === 'id' ? 'CLS001' : null),
              },
            },
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
          provide: StudentFacade,
          useValue: {
            students: mockStudentsSignal,
            loading: signal(false),
            errorMessage: signal(null),
            loadStudents: mockLoadStudents,
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ClassDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create the class detail component', () => {
    expect(component).toBeTruthy();
  });

  it('should load class and students on init', () => {
    expect(mockLoadClasses).toHaveBeenCalled();
    expect(mockLoadStudents).toHaveBeenCalled();
  });

  it('should find the current classItem and students in class', () => {
    expect(component.classItem()?.name).toBe('CNTT-K68-01');
    expect(component.students().length).toBe(1);
    expect(component.students()[0].name).toBe('Nguyen Van A');
  });

  it('should render class details in the template', () => {
    const heading = fixture.debugElement.query(By.css('h1'));
    expect(heading.nativeElement.textContent.trim()).toBe('CNTT-K68-01');

    const rows = fixture.debugElement.queryAll(By.css('.data-table tbody tr'));
    expect(rows.length).toBe(1);
  });
});
