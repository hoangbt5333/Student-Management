import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { By } from '@angular/platform-browser';
import { of } from 'rxjs';
import { GradeService } from '../../services/grade.service';
import { StudentService } from '../../../students/services/student.service';
import { SubjectService } from '../../../subjects/services/subject.service';
import { AuthFacade } from '../../../../core/auth/facades/auth.facade';
import { GradeListComponent } from './grade-list';

describe('GradeListComponent', () => {
  let createGradeCalls: unknown[];
  let fixture: ComponentFixture<GradeListComponent>;
  let component: GradeListComponent;

  beforeEach(async () => {
    createGradeCalls = [];
    await TestBed.configureTestingModule({
      imports: [GradeListComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: AuthFacade,
          useValue: {
            can: () => true,
          },
        },
        {
          provide: GradeService,
          useValue: {
            getGrades: () => of([
              { id: 'D001', studentId: 'SV002', subjectId: 'MH002', score: 9.0 }
            ]),
            createGrade: (grade: unknown) => {
              createGradeCalls.push(grade);
              return of({ ...(grade as object), id: 'generated-id' });
            },
            updateGrade: (grade: unknown) => of(grade),
          },
        },
        {
          provide: StudentService,
          useValue: {
            getStudents: () => of([
              { id: 'SV002', code: 'SV002', name: 'Nguyen Van A' }
            ]),
          },
        },
        {
          provide: SubjectService,
          useValue: {
            getSubjects: () => of([
              { id: 'MH002', code: 'MH002', name: 'Lap trinh Web', credits: 3 }
            ]),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(GradeListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('accepts scores from zero through ten', () => {
    component.form.controls.score.setValue(0);
    expect(component.form.controls.score.valid).toBe(true);
    component.form.controls.score.setValue(10);
    expect(component.form.controls.score.valid).toBe(true);
  });

  it('does not send an invalid score to the API', () => {
    component.form.controls.studentId.setValue('SV001');
    component.form.controls.subjectId.setValue('MH001');
    component.form.controls.score.setValue(10.1);

    component.save();

    expect(component.form.controls.score.invalid).toBe(true);
    expect(createGradeCalls).toHaveLength(0);
  });

  it('posts a grade without a client-generated resource ID', () => {
    component.form.controls.studentId.setValue('SV001');
    component.form.controls.subjectId.setValue('MH001');
    component.form.controls.score.setValue(8.5);

    component.save();

    expect(createGradeCalls).toEqual([{ studentId: 'SV001', subjectId: 'MH001', score: 8.5 }]);
  });

  it('uses entity codes for display while retaining IDs for grade relations', () => {
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

  it('should render page header and toggle add form', async () => {
    const heading = fixture.debugElement.query(By.css('.page-title'));
    expect(heading.nativeElement.textContent.trim()).toBe('Quản lý điểm số');

    expect(component.showForm()).toBe(false);
    expect(fixture.debugElement.query(By.css('.form-card'))).toBeFalsy();

    const addBtn = fixture.debugElement.query(By.css('.primary-button'));
    expect(addBtn).toBeTruthy();
    addBtn.nativeElement.click();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(component.showForm()).toBe(true);
    expect(fixture.debugElement.query(By.css('.form-card'))).toBeTruthy();

    const cancelBtn = fixture.debugElement.query(By.css('.cancel-button'));
    cancelBtn.nativeElement.click();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(component.showForm()).toBe(false);
  });

  it('should render grade rows and score pills in data table', () => {
    const rows = fixture.debugElement.queryAll(By.css('.data-table tbody tr'));
    expect(rows.length).toBe(1);

    const scorePill = fixture.debugElement.query(By.css('.score-pill'));
    expect(scorePill).toBeTruthy();
    expect(scorePill.nativeElement.textContent.trim()).toBe('9.0');
  });
});
