import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatRippleModule } from '@angular/material/core';

interface MenuItem {
  label: string;
  icon: string;
  route: string;
  color: string;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatListModule,
    MatIconModule,
    MatDividerModule,
    MatRippleModule,
  ],
  template: `
    <aside class="material-sidebar">
      <!-- Logo -->
      <div class="sidebar-header">
        <div class="logo-container">
          <div class="logo-icon">
            <mat-icon class="logo-icon-mat">visibility</mat-icon>
          </div>
          <div class="logo-text">
            <div class="logo-title">OptiSass</div>
            <div class="logo-subtitle">Material Design</div>
          </div>
        </div>
      </div>

      <!-- Navigation -->
      <nav class="sidebar-nav">
        <mat-nav-list>
          <a
            mat-list-item
            *ngFor="let item of menuItems"
            [routerLink]="item.route"
            routerLinkActive="active"
            class="nav-item"
            matRipple
          >
            <mat-icon matListItemIcon class="nav-icon" [style.color]="item.color">
              {{ item.icon }}
            </mat-icon>
            <span matListItemTitle class="nav-label">{{ item.label }}</span>
          </a>
        </mat-nav-list>

        <mat-divider class="nav-divider"></mat-divider>

        <mat-nav-list>
          <a
            mat-list-item
            routerLink="/settings"
            class="nav-item"
            matRipple
          >
            <mat-icon matListItemIcon class="nav-icon" style="color: #757575;">
              settings
            </mat-icon>
            <span matListItemTitle class="nav-label">Paramètres</span>
          </a>
        </mat-nav-list>
      </nav>

      <!-- Footer -->
      <div class="sidebar-footer">
        <div class="user-card">
          <div class="user-avatar">
            <span>A</span>
          </div>
          <div class="user-info">
            <div class="user-name">Admin</div>
            <div class="user-email">admin@optisass.com</div>
          </div>
        </div>
      </div>
    </aside>
  `,
  styles: [`
    .material-sidebar {
      height: 100%;
      display: flex;
      flex-direction: column;
      background: #ffffff;
    }

    /* Header */
    .sidebar-header {
      padding: 24px 20px;
      border-bottom: 1px solid #e0e0e0;
      background: #4285f4;
    }

    .logo-container {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .logo-icon {
      width: 48px;
      height: 48px;
      background: rgba(255, 255, 255, 0.2);
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .logo-icon-mat {
      font-size: 28px;
      width: 28px;
      height: 28px;
      color: white;
    }

    .logo-text {
      flex: 1;
    }

    .logo-title {
      font-size: 20px;
      font-weight: 700;
      color: white;
      letter-spacing: -0.5px;
      margin-bottom: 2px;
    }

    .logo-subtitle {
      font-size: 11px;
      color: rgba(255, 255, 255, 0.8);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    /* Navigation */
    .sidebar-nav {
      flex: 1;
      overflow-y: auto;
      padding: 16px 8px;
    }

    ::ng-deep .sidebar-nav .mat-mdc-list {
      padding: 0;
    }

    ::ng-deep .nav-item {
      border-radius: 8px;
      margin-bottom: 4px;
      height: 48px;
      transition: all 0.2s ease;
    }

    ::ng-deep .nav-item:hover {
      background-color: #f5f5f5;
    }

    ::ng-deep .nav-item.active {
      background-color: #e3f2fd;
    }

    .nav-icon {
      font-size: 24px;
      width: 24px;
      height: 24px;
      margin-right: 16px;
    }

    .nav-label {
      font-size: 14px;
      font-weight: 500;
      color: #212121;
    }

    .nav-divider {
      margin: 16px 0;
      border-color: #e0e0e0;
    }

    /* Footer */
    .sidebar-footer {
      padding: 16px;
      border-top: 1px solid #e0e0e0;
      background: #fafafa;
    }

    .user-card {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px;
      background: white;
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .user-card:hover {
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
      transform: translateY(-1px);
    }

    .user-avatar {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: linear-gradient(135deg, #1976d2 0%, #2196f3 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: 700;
      font-size: 16px;
      flex-shrink: 0;
    }

    .user-info {
      flex: 1;
      min-width: 0;
    }

    .user-name {
      font-size: 14px;
      font-weight: 600;
      color: #212121;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      margin-bottom: 2px;
    }

    .user-email {
      font-size: 12px;
      color: #757575;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
  `],
})
export class SidebarComponent {
  menuItems: MenuItem[] = [
    { label: 'Tableau de bord', icon: 'dashboard', route: '/dashboard', color: '#1976d2' },
    { label: 'Clients', icon: 'people', route: '/clients', color: '#388e3c' },
    { label: 'Stock', icon: 'inventory_2', route: '/stock', color: '#f57c00' },
    { label: 'Ventes', icon: 'point_of_sale', route: '/sales', color: '#7b1fa2' },
    { label: 'Mesures', icon: 'straighten', route: '/measurements', color: '#0288d1' },
    { label: 'Essayage virtuel', icon: 'face_retouching_natural', route: '/virtual-tryon', color: '#c2185b' },
    { label: 'Dépenses', icon: 'receipt_long', route: '/expenses', color: '#d32f2f' },
    { label: 'Paie', icon: 'payments', route: '/payroll', color: '#303f9f' },
  ];
}
