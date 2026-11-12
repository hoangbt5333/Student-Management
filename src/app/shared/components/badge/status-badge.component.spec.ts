import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, expect, it, beforeEach } from 'vitest';
import { StatusBadgeComponent, StatusBadgeStatus } from './status-badge.component';

describe('StatusBadgeComponent', () => {
  let fixture: ComponentFixture<StatusBadgeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [StatusBadgeComponent] }).compileComponents();
    fixture = TestBed.createComponent(StatusBadgeComponent);
  });

  const statuses: Array<[StatusBadgeStatus, string, string]> = [
    ['active', 'Active', 'badge-success'],
    ['inactive', 'Inactive', 'badge-neutral'],
    ['pending', 'Pending', 'badge-warning'],
    ['suspended', 'Suspended', 'badge-danger'],
  ];

  it.each(statuses)('renders %s with its default label and style', (status, label, styleClass) => {
    fixture.componentRef.setInput('status', status);
    fixture.detectChanges();

    const badge = fixture.nativeElement.querySelector('span') as HTMLSpanElement;
    expect(badge.textContent?.trim()).toBe(label);
    expect(badge.classList).toContain('badge');
    expect(badge.classList).toContain(styleClass);
  });

  it('renders the optional label when provided', () => {
    fixture.componentRef.setInput('status', 'pending');
    fixture.componentRef.setInput('label', 'Awaiting review');
    fixture.detectChanges();

    const badge = fixture.nativeElement.querySelector('span') as HTMLSpanElement;
    expect(badge.textContent?.trim()).toBe('Awaiting review');
    expect(badge.classList).toContain('badge-warning');
  });
});
