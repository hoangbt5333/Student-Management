import { TestBed } from '@angular/core/testing';
import { StudentFacade } from './student-facade';

describe('StudentFacade', () => {
  let service: StudentFacade;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(StudentFacade);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
