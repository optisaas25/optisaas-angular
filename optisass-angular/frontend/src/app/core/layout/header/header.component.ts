import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatBadgeModule } from '@angular/material/badge';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [
    CommonModule,
    MatToolbarModule,
    MatIconModule,
    MatButtonModule,
    MatMenuModule,
    MatBadgeModule,
    MatDividerModule,
    MatFormFieldModule,
    MatInputModule,
  ],
  template: `
    <mat-toolbar class="material-header" color="primary">
      <div class="header-container">
        <!-- Left Section -->
        <div class="header-left">
          <h1 class="page-title">Clients</h1>
        </div>

        <!-- Center Section - Search -->
        <div class="header-center">
          <mat-form-field class="search-field" appearance="outline">
            <mat-icon matPrefix class="search-icon">search</mat-icon>
            <input matInput placeholder="Rechercher..." />
          </mat-form-field>
        </div>

        <!-- Right Section -->
        <div class="header-right">
          <button mat-icon-button class="header-btn">
            <mat-icon [matBadge]="3" matBadgeColor="warn" matBadgeSize="small">
              notifications
            </mat-icon>
          </button>

          <button mat-icon-button class="header-btn">
            <mat-icon>help_outline</mat-icon>
          </button>

          <button mat-button [matMenuTriggerFor]="userMenu" class="user-button">
            <div class="user-avatar">A</div>
            <span class="user-name">Admin</span>
            <mat-icon>expand_more</mat-icon>
          </button>

          <mat-menu #userMenu="matMenu" class="user-menu">
            <div class="user-menu-header">
              <div class="user-menu-avatar">A</div>
              <div class="user-menu-info">
                <div class="user-menu-name">Admin User</div>
                <div class="user-menu-email">admin@optisass.com</div>
              </div>
            </div>
            <mat-divider></mat-divider>
            <button mat-menu-item>
              <mat-icon>person</mat-icon>
              <span>Profil</span>
            </button>
            <button mat-menu-item>
              <mat-icon>settings</mat-icon>
              <span>Paramètres</span>
            </button>
            <mat-divider></mat-divider>
            <button mat-menu-item>
              <mat-icon>logout</mat-icon>
              <span>Déconnexion</span>
            </button>
          </mat-menu>
        </div>
      </div>
    </mat-toolbar>
  `,
  styles: [`
    .material-header {
      background: #4285f4;
      color: white;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      height: 64px;
      padding: 0 24px;
    }

    .header-container {
      display: flex;
      align-items: center;
      justify-content: space-between;
      width: 100%;
      max-width: 1400px;
      margin: 0 auto;
      gap: 24px;
      height: 100%;
    }

    /* Left */
    .header-left {
      flex: 0 0 auto;
    }

    .page-title {
      font-size: 20px;
      font-weight: 500;
      margin: 0;
      color: white;
    }

    /* Center - Search */
    .header-center {
      flex: 1;
      max-width: 600px;
    }

    ::ng-deep .search-field {
      width: 100%;
    }

    ::ng-deep .search-field .mat-mdc-text-field-wrapper {
      background: rgba(255, 255, 255, 0.15);
      border-radius: 4px;
    }

    ::ng-deep .search-field .mat-mdc-form-field-focus-overlay {
      background-color: rgba(255, 255, 255, 0.1);
    }

    ::ng-deep .search-field .mdc-text-field--outlined .mdc-notched-outline {
      border-color: rgba(255, 255, 255, 0.3);
    }

    ::ng-deep .search-field.mat-focused .mdc-notched-outline {
      border-color: white !important;
    }

    ::ng-deep .search-field input {
      color: white;
    }

    ::ng-deep .search-field input::placeholder {
      color: rgba(255, 255, 255, 0.7);
    }

    ::ng-deep .search-field .mat-mdc-form-field-icon-prefix {
      color: rgba(255, 255, 255, 0.7);
      padding-right: 8px;
    }

    .search-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
    }

    /* Right */
    .header-right {
      display: flex;
      align-items: center;
      gap: 8px;
      flex: 0 0 auto;
    }

    .header-btn {
      color: white;
    }

    .user-button {
      display: flex;
      align-items: center;
      gap: 8px;
      color: white;
      padding: 0 12px;
      height: 40px;
      border-radius: 20px;
      background: rgba(255, 255, 255, 0.1);
      transition: background 0.2s ease;
    }

    .user-button:hover {
      background: rgba(255, 255, 255, 0.2);
    }

    .user-avatar {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: white;
      color: #1976d2;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 600;
      font-size: 14px;
    }

    .user-name {
      font-size: 14px;
      font-weight: 500;
    }

    /* User Menu */
    ::ng-deep .user-menu {
      width: 280px;
      margin-top: 8px;
    }

    .user-menu-header {
      display: flex;
      gap: 12px;
      padding: 16px;
      background: #f5f5f5;
    }

    .user-menu-avatar {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background: linear-gradient(135deg, #1976d2 0%, #2196f3 100%);
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 600;
      font-size: 18px;
      flex-shrink: 0;
    }

    .user-menu-info {
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: center;
    }

    .user-menu-name {
      font-size: 16px;
      font-weight: 600;
      color: #212121;
      margin-bottom: 4px;
    }

    .user-menu-email {
      font-size: 13px;
      color: #757575;
    }

    ::ng-deep .user-menu button mat-icon {
      margin-right: 12px;
      color: #757575;
    }

    @media (max-width: 768px) {
      .material-header {
        padding: 0 16px;
      }

      .header-center {
        display: none;
      }

      .page-title {
        font-size: 18px;
      }

      .user-name {
        display: none;
      }
    }
  `],
})
export class HeaderComponent { }
