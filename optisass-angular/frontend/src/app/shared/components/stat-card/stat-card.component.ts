import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';

export type StatCardColor = 'blue' | 'green' | 'orange' | 'purple' | 'teal' | 'pink' | 'red' | 'indigo';

@Component({
    selector: 'app-stat-card',
    standalone: true,
    imports: [CommonModule, MatCardModule],
    template: `
    <mat-card [class]="'stat-card stat-card-' + color">
      <mat-card-content>
        <div class="stat-value">{{ value }}</div>
        <div class="stat-label">{{ label }}</div>
      </mat-card-content>
    </mat-card>
  `,
    styles: [`
    .stat-card {
      padding: 24px;
      border-radius: 8px;
      box-shadow: 0 1px 2px 0 rgba(60,64,67,.3), 0 1px 3px 1px rgba(60,64,67,.15);
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      cursor: pointer;
    }

    .stat-card:hover {
      box-shadow: 0 1px 2px 0 rgba(60,64,67,.3), 0 2px 6px 2px rgba(60,64,67,.15);
      transform: translateY(-2px);
    }

    .stat-card-blue {
      background: linear-gradient(135deg, #4285f4 0%, #1a73e8 100%);
      color: white;
    }

    .stat-card-green {
      background: linear-gradient(135deg, #34a853 0%, #0d652d 100%);
      color: white;
    }

    .stat-card-orange {
      background: linear-gradient(135deg, #fb8c00 0%, #ef6c00 100%);
      color: white;
    }

    .stat-card-purple {
      background: linear-gradient(135deg, #7b1fa2 0%, #4a148c 100%);
      color: white;
    }

    .stat-card-teal {
      background: linear-gradient(135deg, #00897b 0%, #00695c 100%);
      color: white;
    }

    .stat-card-pink {
      background: linear-gradient(135deg, #e91e63 0%, #c2185b 100%);
      color: white;
    }

    .stat-card-red {
      background: linear-gradient(135deg, #ea4335 0%, #d93025 100%);
      color: white;
    }

    .stat-card-indigo {
      background: linear-gradient(135deg, #5e35b1 0%, #4527a0 100%);
      color: white;
    }

    .stat-value {
      font-size: 32px;
      font-weight: 700;
      margin-bottom: 8px;
    }

    .stat-label {
      font-size: 14px;
      opacity: 0.9;
      font-weight: 500;
    }
  `]
})
export class StatCardComponent {
    @Input() value: string | number = 0;
    @Input() label: string = '';
    @Input() color: StatCardColor = 'blue';
}
