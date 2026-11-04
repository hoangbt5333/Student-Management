import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { StudentForm } from './student-form';
import { ClassService } from '../../../classes/services/class.service';

describe('StudentForm', () => {
  let component: StudentForm;
  let fixture: ComponentFixture<StudentForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StudentForm],
      providers: [
        {
          provide: ClassService,
          useValue: {
            getAll: () => of([]),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(StudentForm);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
