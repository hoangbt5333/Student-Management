import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component } from '@angular/core';
import { describe, it, expect, beforeEach } from 'vitest';
import { ModalComponent } from './modal.component';

@Component({
  imports: [ModalComponent],
  template: `
    <app-modal [title]="title" (close)="onClose()">
      <p id="test-content">Nội dung test</p>
    </app-modal>
  `
})
class TestHostComponent {
  title = 'Test Modal Title';
  closed = false;

  onClose(): void {
    this.closed = true;
  }
}

describe('ModalComponent', () => {
  let hostComponent: TestHostComponent;
  let fixture: ComponentFixture<TestHostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestHostComponent, ModalComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TestHostComponent);
    hostComponent = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the modal host', () => {
    expect(hostComponent).toBeTruthy();
  });

  it('should render the modal title', () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.modal-title')?.textContent).toContain('Test Modal Title');
  });

  it('should project modal body content', () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('#test-content')?.textContent).toContain('Nội dung test');
  });

  it('should emit close when clicking the close button (X)', () => {
    const el = fixture.nativeElement as HTMLElement;
    const closeBtn = el.querySelector('.modal-close-button') as HTMLButtonElement;
    closeBtn.click();
    expect(hostComponent.closed).toBe(true);
  });

  it('should emit close when clicking on the backdrop', () => {
    const el = fixture.nativeElement as HTMLElement;
    const backdrop = el.querySelector('.modal-backdrop') as HTMLElement;
    backdrop.click();
    expect(hostComponent.closed).toBe(true);
  });

  it('should NOT emit close when clicking inside the modal dialog', () => {
    const el = fixture.nativeElement as HTMLElement;
    const dialog = el.querySelector('.modal-dialog') as HTMLElement;
    dialog.click();
    expect(hostComponent.closed).toBe(false);
  });

  it('should emit close when pressing the Escape key', () => {
    const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape', cancelable: true });
    document.dispatchEvent(escapeEvent);
    expect(hostComponent.closed).toBe(true);
  });
});
