import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TooltipDirective, TooltipPosition } from './tooltip.directive';

@Component({
  standalone: true,
  imports: [TooltipDirective],
  template: `
    <button
      id="test-btn"
      [appTooltip]="tooltipText()"
      [tooltipPosition]="position()"
      [tooltipDisabled]="disabled()"
    >
      Nút thao tác
    </button>
  `
})
class TestHostComponent {
  readonly tooltipText = signal('Thông tin chi tiết');
  readonly position = signal<TooltipPosition>('top');
  readonly disabled = signal(false);
}

describe('TooltipDirective', () => {
  let fixture: ComponentFixture<TestHostComponent>;
  let component: TestHostComponent;
  let buttonEl: HTMLButtonElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestHostComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(TestHostComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    buttonEl = fixture.nativeElement.querySelector('#test-btn');
  });

  afterEach(() => {
    // Clean up any remaining tooltip elements from document.body
    document.querySelectorAll('.app-tooltip').forEach((el) => el.remove());
  });

  it('should create host component with directive', () => {
    expect(buttonEl).toBeTruthy();
  });

  it('should show tooltip on mouseenter and remove on mouseleave', () => {
    buttonEl.dispatchEvent(new MouseEvent('mouseenter'));
    fixture.detectChanges();

    const tooltip = document.querySelector('.app-tooltip') as HTMLElement;
    expect(tooltip).toBeTruthy();
    expect(tooltip.textContent).toContain('Thông tin chi tiết');
    expect(tooltip.getAttribute('role')).toBe('tooltip');
    expect(tooltip.getAttribute('data-position')).toBe('top');

    const ariaDescribedBy = buttonEl.getAttribute('aria-describedby');
    expect(ariaDescribedBy).toBeTruthy();
    expect(tooltip.id).toBe(ariaDescribedBy);

    buttonEl.dispatchEvent(new MouseEvent('mouseleave'));
    fixture.detectChanges();

    expect(document.querySelector('.app-tooltip')).toBeNull();
    expect(buttonEl.getAttribute('aria-describedby')).toBeNull();
  });

  it('should show tooltip on focusin and remove on focusout', () => {
    buttonEl.dispatchEvent(new FocusEvent('focusin'));
    fixture.detectChanges();

    const tooltip = document.querySelector('.app-tooltip');
    expect(tooltip).toBeTruthy();

    buttonEl.dispatchEvent(new FocusEvent('focusout'));
    fixture.detectChanges();

    expect(document.querySelector('.app-tooltip')).toBeNull();
  });

  it('should not show tooltip if text is empty or blank', () => {
    component.tooltipText.set('   ');
    fixture.detectChanges();

    buttonEl.dispatchEvent(new MouseEvent('mouseenter'));
    fixture.detectChanges();

    expect(document.querySelector('.app-tooltip')).toBeNull();
  });

  it('should not show tooltip if tooltipDisabled is true', () => {
    component.disabled.set(true);
    fixture.detectChanges();

    buttonEl.dispatchEvent(new MouseEvent('mouseenter'));
    fixture.detectChanges();

    expect(document.querySelector('.app-tooltip')).toBeNull();
  });

  it('should support bottom, left, and right positions', () => {
    component.position.set('bottom');
    fixture.detectChanges();

    buttonEl.dispatchEvent(new MouseEvent('mouseenter'));
    fixture.detectChanges();

    let tooltip = document.querySelector('.app-tooltip') as HTMLElement;
    expect(tooltip.getAttribute('data-position')).toBe('bottom');

    buttonEl.dispatchEvent(new MouseEvent('mouseleave'));
    fixture.detectChanges();

    component.position.set('left');
    fixture.detectChanges();
    buttonEl.dispatchEvent(new MouseEvent('mouseenter'));
    fixture.detectChanges();

    tooltip = document.querySelector('.app-tooltip') as HTMLElement;
    expect(tooltip.getAttribute('data-position')).toBe('left');

    buttonEl.dispatchEvent(new MouseEvent('mouseleave'));
    fixture.detectChanges();

    component.position.set('right');
    fixture.detectChanges();
    buttonEl.dispatchEvent(new MouseEvent('mouseenter'));
    fixture.detectChanges();

    tooltip = document.querySelector('.app-tooltip') as HTMLElement;
    expect(tooltip.getAttribute('data-position')).toBe('right');
  });

  it('should remove tooltip on component / directive destroy', () => {
    buttonEl.dispatchEvent(new MouseEvent('mouseenter'));
    fixture.detectChanges();

    expect(document.querySelector('.app-tooltip')).toBeTruthy();

    fixture.destroy();
    expect(document.querySelector('.app-tooltip')).toBeNull();
  });
});
