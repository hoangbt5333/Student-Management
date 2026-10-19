import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { AcademicService } from '../../data-access/academic.service';
import { StudentService } from '../../../students/data-access/student';
import { GradeListComponent } from './grade-list';

describe('GradeListComponent', () => {
  let createGradeCalls: unknown[];

  beforeEach(() => {
    createGradeCalls = [];
    TestBed.configureTestingModule({
      imports: [GradeListComponent],
      providers: [
        provideRouter([]),
        {
          provide: AcademicService,
          useValue: {
            getGrades: () => of([]),
            getSubjects: () => of([]),
            createGrade: (grade: unknown) => {
              createGradeCalls.push(grade);
              return of({ ...grade as object, id: 'generated-id' });
            },
          },
        },
        { provide: StudentService, useValue: { getStudents: () => of([]) } },
      ],
    });
  });

  it('accepts scores from zero through ten', () => {
    const component = TestBed.createComponent(GradeListComponent).componentInstance;
    component.form.controls.score.setValue(0);
    expect(component.form.controls.score.valid).toBe(true);
    component.form.controls.score.setValue(10);
    expect(component.form.controls.score.valid).toBe(true);
  });

  it('does not send an invalid score to the API', () => {
    const component = TestBed.createComponent(GradeListComponent).componentInstance;
    component.form.controls.studentId.setValue('SV001');
    component.form.controls.subjectId.setValue('MH001');
    component.form.controls.score.setValue(10.1);

    component.save();

    expect(component.form.controls.score.invalid).toBe(true);
    expect(createGradeCalls).toHaveLength(0);
  });

  it('posts a grade without a client-generated resource ID', () => {
    const fixture = TestBed.createComponent(GradeListComponent);
    const component = fixture.componentInstance;
    component.form.controls.studentId.setValue('SV001');
    component.form.controls.subjectId.setValue('MH001');
    component.form.controls.score.setValue(8.5);

    component.save();

    expect(createGradeCalls).toEqual([{ studentId: 'SV001', subjectId: 'MH001', score: 8.5 }]);
  });

  it('uses entity codes for display while retaining IDs for grade relations', () => {
    const component = TestBed.createComponent(GradeListComponent).componentInstance;
    component.students.set([{
      id: 'R2J5VkW',
      code: 'SV005',
      name: 'Phạm Văn C',
      email: 'student@example.com',
      phone: '0900000000',
    }]);
    component.subjects.set([{
      id: 'LP7XYCZ',
      code: 'MH006',
      name: 'IP',
      credits: 3,
    }]);

    expect(component.studentCode('R2J5VkW')).toBe('SV005');
    expect(component.subjectCode('LP7XYCZ')).toBe('MH006');
  });
});
