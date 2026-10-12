import { ComponentFixture, TestBed } from '@angular/core/testing';
import { InputChangeDemo } from './input-change-demo';

describe('InputChangeDemo', () => {
  let component: InputChangeDemo;
  let fixture: ComponentFixture<InputChangeDemo>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InputChangeDemo],
    }).compileComponents();

    fixture = TestBed.createComponent(InputChangeDemo);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
