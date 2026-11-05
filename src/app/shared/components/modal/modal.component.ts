import { Component, input, output, HostListener } from '@angular/core';

@Component({
  selector: 'app-modal',
  standalone: true,
  templateUrl: './modal.component.html',
  styleUrl: './modal.component.css'
})
export class ModalComponent {
  readonly title = input<string>('');
  readonly size = input<'sm' | 'md' | 'lg'>('md');

  readonly close = output<void>();

  @HostListener('document:keydown.escape', ['$event'])
  onEscape(event: Event): void {
    event.preventDefault();
    this.close.emit();
  }

  onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.close.emit();
    }
  }

  onClose(): void {
    this.close.emit();
  }
}
