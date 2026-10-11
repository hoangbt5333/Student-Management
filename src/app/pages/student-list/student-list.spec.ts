import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { StudentService } from '../../services/student';
import { StudentListComponent } from './student-list';

describe('StudentList', () => {
  let component: StudentListComponent;
  let fixture: ComponentFixture<StudentListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StudentListComponent],
      providers: [
        { provide: StudentService, useValue: { getStudents: () => of([]) } },
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

  it('should match Vietnamese names without typing their diacritics', () => {
    const student = {
      id: 'SV01',
      name: 'Nguyễn Bình',
      email: 'binh@example.com',
      phone: '0123456789',
    };

    component.students.set([student]);
    component.searchTerm.set('bi');

    expect(component.filteredStudents()).toEqual([student]);
  });
});
