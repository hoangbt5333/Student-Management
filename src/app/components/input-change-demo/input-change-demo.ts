import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';

@Component({
  imports: [],
  selector: 'app-input-change-demo',
  styleUrl: './input-change-demo.css',
  templateUrl: './input-change-demo.html',
})
export class InputChangeDemo implements OnChanges{
  @Input() value = '';

  ngOnChanges(changes: SimpleChanges): void {
    const change = changes['value'];

    if (change) {
      console.log('Input thay đổi:', {
        previousValue: change.previousValue,
        currentValue: change.currentValue,
        firstChange: change.firstChange,
      });
    }
  }
}
