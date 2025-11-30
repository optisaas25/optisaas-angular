import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export type StatusType = 'active' | 'inactive' | 'pending' | 'success' | 'warning' | 'error';

@Component({
    selector: 'app-status-badge',
    standalone: true,
    imports: [CommonModule],
    template: `
    <span [class]="'status-badge status-' + type">
      {{ label }}
    </span>
  `,
    styles: [`
    .status-badge {
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 500;
      display: inline-block;
    }

    .status-active {
      background-color: #e6f4ea;
      color: #1e8e3e;
    }

    .status-inactive {
      background-color: #fce8e6;
      color: #d93025;
    }

    .status-pending {
      background-color: #fef7e0;
      color: #f9ab00;
    }

    .status-success {
      background-color: #e6f4ea;
      color: #1e8e3e;
    }

    .status-warning {
      background-color: #fef7e0;
      color: #f9ab00;
    }

    .status-error {
      background-color: #fce8e6;
      color: #d93025;
    }
  `]
})
export class StatusBadgeComponent {
    @Input() label: string = '';
    @Input() type: StatusType = 'active';
}
