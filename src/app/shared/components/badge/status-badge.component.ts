import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export type StatusBadgeStatus = 'active' | 'inactive' | 'pending' | 'suspended';

@Component({
  selector: 'app-status-badge',
  standalone: true,
  template: ` <span class="badge" [class]="'badge ' + statusClass()">{{ displayLabel() }}</span> `,
  styles: `
    :host {
      display: contents;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatusBadgeComponent {
  readonly status = input.required<StatusBadgeStatus>();
  readonly label = input<string>();

  readonly displayLabel = computed(
    () => this.label() ?? this.status().charAt(0).toUpperCase() + this.status().slice(1),
  );

  readonly statusClass = computed(() => {
    switch (this.status()) {
      case 'active':
        return 'badge-success';
      case 'inactive':
        return 'badge-neutral';
      case 'pending':
        return 'badge-warning';
      case 'suspended':
        return 'badge-danger';
    }
  });
}
