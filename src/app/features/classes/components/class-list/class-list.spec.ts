import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { ClassList } from './class-list';
import { ClassService } from '../../services/class.service';
import { StudentService } from '../../../students/services/student.service';

describe('ClassList', () => {
  let component: ClassList;
  let fixture: ComponentFixture<ClassList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ClassList],
      providers: [
        provideRouter([]),
        {
          provide: ClassService,
          useValue: {
            getAll: () => of([]),
          },
        },
        {
          provide: StudentService,
          useValue: {
            getStudents: () => of([]),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ClassList);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
